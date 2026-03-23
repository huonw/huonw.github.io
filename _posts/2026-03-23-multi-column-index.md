---
layout: default
title: "Why don't multi-column indices help queries on the second column?"

description: >-
  A sorted-table mental model explains vast differences in performance for similar queries involving only one of a multi-column index in a database.

hashtags: []
comments:
---

SQL databases support multi-column indices, where a single index can incorporate data from multiple columns. These are powerful, but the order of the columns matters, with differences observable in practice: there can be orders of magnitude between two similar & simple queries, depending on which uses a prefix of the index columns. Why does this limitation exist? Can we have a mental model for the indices that explains the behaviour?

Yes, we can: thinking about indices as a sorted table with multiple columns provides that intuition:

- For a query involving the **first columns**, successive lookups on the relevant subsets of the index always see **ordered** data, making an efficient [binary search][binary-search] possible,
- For a query involving only a **later column**, that column's data is arranged **haphazardly** in the index, meaning there's no hope of a binary search.

[binary-search]: https://en.wikipedia.org/wiki/Binary_search

It's the sorted nature of a database's typical B-tree index that drives this trade-off.

## Context

Imagine we're building an app for silverware enthusiasts, so we set our table like so:

{% highlight sql linenos %}
CREATE TABLE cutlery (
  id BIGINT PRIMARY KEY,
  -- fork, spoon, knife, straw, strork, etc.
  kind TEXT,
  -- silver, red, puce, etc.
  colour TEXT
);
{% endhighlight %}

It turns out some people have a lot of forks and spoons, and want to find the item with the exact right shape and colour. Thus, we've discovered queries like this are common[^knork] and very slow:

{% highlight sql linenos %}
SELECT * FROM cutlery
WHERE kind = 'knork' AND colour = 'mahogany';
{% endhighlight %}

[^knork]: Yeah, looking for a red-brown-ish knife-fork is common.

### Changes

Slow query? We need an index. There are a few options worth considering:

{% highlight sql linenos %}
-- 1. index just kind:
CREATE INDEX idx_cutlery_kind
ON cutlery (kind);

-- 2. index just colour:
CREATE INDEX idx_cutlery_colour
ON cutlery (colour);

-- 3. index both, together
CREATE INDEX idx_cutlery_kind_colour
ON cutlery (kind, colour);
{% endhighlight %}

Options 1 & 2 are the simplest, and doing one (or both) may give sufficient performance. But maybe not. Option 3 is a multi-column index, that combines both `kind` and `colour` into one data structure. Let's benchmark[^benchmark] the options:

[^benchmark]: Benchmark methodology, for all numbers in this article:

    - Software: PostgreSQL 17.7 and 18.1 running via Podman (results are 17.7 unless otherwise stated); Python 3.13.11 & psycopg 3.3.2 running natively; M1 MacBook Pro; macOS 26.0; `uv run bench.py`.
    - Scenario: 20 million rows inserted into the `cutlery` table structure above, using `random(1, 2000)::text` for both `kind` and `colour` columns (independently).
    - Queries: `SELECT * FROM cutlery WHERE kind = '17' AND colour = '630'` and the two single-column versions of that.
    - Measurement: for each combination of database version, query and indices: create the indices (if required), 3 unmeasured warm-up executions, then 15 measured ones with `EXPLAIN (ANALYZE, TIMING OFF, COSTS OFF, BUFFERS OFF)`, parse the database's reported time from the output and take the minimum of the 15.
    - [Code and results](https://gist.github.com/huonw/1f35b04ed99911d2eea658faa62bb667).

    <details markdown="1"><summary>Full code reproduced here, too.</summary>

    ```python
    # /// script
    # requires-python = ">=3.12"
    # dependencies = [
    #     "psycopg[binary]>=3.2,<4",
    # ]
    #
    # [tool.uv]
    # exclude-newer = "2026-02-04T00:00:00Z"
    # ///

    import json
    import subprocess
    import sys
    import textwrap
    import time

    import psycopg

    # Data/query details
    INIT = """
    DROP TABLE IF EXISTS cutlery;
    CREATE TABLE cutlery (
      id BIGSERIAL PRIMARY KEY,
      -- fork, spoon, knife, straw, strork, etc.
      kind text,
      -- silver, red, puce, etc.
      colour text
    );

    INSERT INTO cutlery (kind, colour)
    SELECT random(1, 2000)::text, random(1, 2000)::text
    FROM generate_series(1, 20000000) AS t(id);
    """

    QUERIES = {
        "Both": "SELECT * FROM cutlery WHERE kind = '17' AND colour = '630'",
        "Kind": "SELECT * FROM cutlery WHERE kind = '17'",
        "Colour": "SELECT * FROM cutlery WHERE colour = '630'",
    }

    # Benchmarked scenarios
    IDX_KIND_ONLY = (
        "CREATE INDEX idx_cutlery_kind ON cutlery (kind)",
        "DROP INDEX IF EXISTS idx_cutlery_kind",
    )
    IDX_COLOUR_ONLY = (
        "CREATE INDEX idx_cutlery_colour ON cutlery (colour)",
        "DROP INDEX IF EXISTS idx_cutlery_colour",
    )
    IDX_MULTI = (
        "CREATE INDEX idx_cutlery_kind_colour ON cutlery (kind, colour)",
        "DROP INDEX IF EXISTS idx_cutlery_kind_colour",
    )

    # name -> list of (setup, teardown) pairs
    SCENARIOS = {
        "No index": [],
        "Kind-only": [IDX_KIND_ONLY],
        "Colour-only": [IDX_COLOUR_ONLY],
        "Both onlys": [IDX_KIND_ONLY, IDX_COLOUR_ONLY],
        "Multi-col": [IDX_MULTI],
    }

    # Benchmark metadata
    WARMUP = 3
    RUNS = 15

    # Container info
    CONTAINER = "bench-pg"
    PORT = 25432
    PASSWORD = "postgres"
    CONNINFO = f"postgresql://postgres:{PASSWORD}@localhost:{PORT}/postgres"

    IMAGES = [
        "postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4",
        "postgres:18.1@sha256:3bb77a07b9ce8b8de0fe6d9b063adf20b9cca1068a1bcdc054cac71a69ce0ca6",
    ]


    def start_postgres(image):
        # in case a previous run didn't finish cleanly
        stop_postgres()

        print(f"  Starting postgres using image {image}...")
        subprocess.run(
            f"podman run -d --name {CONTAINER} -e POSTGRES_PASSWORD={PASSWORD} -p {PORT}:5432 {image}",
            shell=True,
        )
        # Give it a bit of time to become ready, and then start polling for readiness
        time.sleep(1)
        for i in range(10):
            r = subprocess.run(
                f"podman exec {CONTAINER} pg_isready -U postgres -q", shell=True
            )
            if r.returncode == 0:
                return
            time.sleep(0.2)
        raise Exception("postgres never became ready")


    def stop_postgres():
        print("  Stopping postgres...")
        subprocess.run(f"podman rm -f {CONTAINER}", shell=True)


    def run_scenario(cur, name, stmts):
        # Setup
        for setup, _teardown in stmts:
            cur.execute(setup)

        for query_name, query in QUERIES.items():
            for _ in range(WARMUP):
                cur.execute(query)
                cur.fetchall()

            # Benchmark
            times = []
            for _ in range(RUNS):
                cur.execute(
                    f"EXPLAIN (ANALYZE, TIMING OFF, COSTS OFF, BUFFERS OFF) {query}"
                )
                for (row,) in cur.fetchall():
                    # lines like 'Execution Time: 3.750 ms'
                    if row.startswith("Execution Time"):
                        times.append(float(row.split(":")[1].strip().split()[0]))

            # Report/teardown
            times.sort()

            yield {
                "index": name,
                "query": query_name,
                "min": times[0],
                "median": times[len(times) // 2],
                "max": times[-1],
                "times": times,
            }
        for _setup, teardown in stmts:
            cur.execute(teardown)


    def run_benchmark():
        results = []

        for image in IMAGES:
            print(f"Running {image}...")
            start_postgres(image)
            image_results = []

            with psycopg.connect(CONNINFO) as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    print("  Initialising...")
                    cur.execute(INIT)
                    cur.execute("VACUUM ANALYZE")

                    print("  Benchmark...")
                    for name, stmts in SCENARIOS.items():
                        image_results.extend(run_scenario(cur, name, stmts))

            results.append({"image": image, "results": image_results})

        data = {
            "versions": {
                "python": sys.version,
                "psycopg": psycopg.__version__,
            },
            "metadata": {
                "INIT": INIT,
                "QUERIES": QUERIES,
                "SCENARIOS": SCENARIOS,
                "WARMUP": WARMUP,
                "RUNS": RUNS,
                "IMAGES": IMAGES,
            },
            "results": results,
        }
        print(json.dumps(data, indent=2))

    if __name__ == "__main__":
        try:
            run_benchmark()
        finally:
            stop_postgres()
    ```

    </details>

| Indexing         | Time (ms) | Speedup vs 'None' |
|------------------|----------:|------------------:|
| None             |       420 |                1× |
| Just kind (1)    |      4.78 |               88× |
| Just colour (2)  |      4.60 |               91× |
| Both (1 + 2)     |      1.28 |              328× |
| Multi-column (3) |     0.009 |            46700× |

Looks like we can get two orders of magnitude faster using one or both simple indices, and another two orders faster with the multi-column one. Optimising something to be 50000× faster is a good day's work!

### Confusion

Now, we were hyper-focused on just one particularly slow query, but most apps query their database in more than one way. Here are two very similar queries, with each dropping one of the two filtering conditions from the `WHERE` clause:

{% highlight sql linenos %}
-- kind-only, no colour
SELECT * FROM cutlery WHERE kind = 'knork';
-- colour-only, no kind
SELECT * FROM cutlery WHERE colour = 'mahogany';
{% endhighlight %}

After adding the multi-column `idx_cutlery_kind_colour` index, the benchmarks[^benchmark] prove the kind-only query gets much faster, but the colour-only is still slow[^slower].

[^slower]: This table even shows the colour-only appearing to get 2.5% slower, from 480ms to 492ms, but that's well within error bars and likely just noise.

| Query        | No index (ms) | With index (ms) | Speedup |
|--------------|--------------:|----------------:|--------:|
| Both columns |           420 |           0.009 |  46700× |
| Kind-only    |           403 |            4.79 |     84× |
| Colour-only  |           480 |             492 |      1× |

Both of the "only" queries just drop one and keep one column compared to our original, but there's a gulf between them.

Why does the multi-column index improve one a lot, and the other not at all? Why is kind-only two orders of magnitude faster than the colour-only with this index?


## Callouts

The database docs answer the immediate question. For instance, [PostgreSQL](https://www.postgresql.org/docs/18/indexes-multicolumn.html) (emphasis mine):

> the index is most efficient when there are constraints on the **leading (leftmost) columns**

And, similarly, [MySQL](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html) (emphasis still mine):

>  If the table has a multiple-column index, **any leftmost prefix** of the index can be used by the optimizer to look up rows. For example, if you have a three-column index on `(col1, col2, col3)`, you have indexed search capabilities on `(col1)`, `(col1, col2)`, and `(col1, col2, col3)`.

Let's bring the index and the single-column queries together:

{% highlight sql linenos %}
CREATE INDEX idx_cutlery_kind_colour
ON cutlery (kind, colour);
-- kind-only, no colour
SELECT * FROM cutlery WHERE kind = 'knork';
-- colour-only, no kind
SELECT * FROM cutlery WHERE colour = 'mahogany';
{% endhighlight %}

Comparing the queries and the index shows that, yes, indeed:

- The now-faster kind-only query uses the _first_ column `kind` of the index, and thus the index is applicable and efficient.
- The still-slow colour-only query uses only the _second_ column `colour` of the index. This is not using a leftmost prefix of the index's columns (`kind` is missing), and thus the index isn't applicable.

But, why? Why does an index like this have a constraint like that?

## Concepts

The default index in most SQL databases is ordered, relying on binary search for efficiency[^btree], getting that `O(log n)` tastiness.

[^btree]: At least, binary search conceptually: in practice, these indices are typically implemented as [B](https://en.wikipedia.org/wiki/B-tree) or [B+](https://en.wikipedia.org/wiki/B%2B_tree) trees.

We can visualise this in a **flat ordered table**, with the index columns plus a 'locations' column[^location], ordered by the index columns, using each column of the multi-column index as a tie-breaker if the earlier ones are equal. We're working with `text` columns, so everything is alphabetical.

Here's a version for 7 rows, with a few different kind and colour values:

[^location]: The pedagogically-convenient locations column represents whatever information the database engine needs to find the actual data stored for the rows corresponding to a given index entry, such as the primary key (MySQL), tuple identifier (PostgreSQL), or row ID (SQLite). The specifics seem to vary between DBMSes, and aren't important for understanding how the "multi-column" part of a multi-column index works.

| `kind`     | `colour`   | locations |
|------------|------------|-----------|
| chopsticks | mahogany   | 5         |
| chopsticks | zebra      | 3         |
| knork      | mahogany   | 2, 7      |
| knork      | salmon     | 4         |
| tongs      | aqua       | 1         |
| tongs      | periwinkle | 6         |

### Column-lookup: both

This index works well for filtering `WHERE kind = 'knork' AND colour = 'mahogany'`, with two conceptual steps:

1. Do a binary search on the `kind` column to find the two knork entries, efficiently skipping over the chopsticks and tongs. The column is ordered, so binary search can work.

   | `kind` | `colour` | locations |
   |--------|----------|-----------|
   | knork  | mahogany | 2, 7      |
   | knork  | salmon   | 4         |

2. Do a second binary search on the reduced `colour` column to find the knork rows that are also mahogany. Now that we've restricted to only `kind = 'knork'` rows, the remaining two values are ordered too: `'mahogany' < 'salmon'` (at least, they are alphabetically, I know nothing of your colour preferences).

   | `kind` | `colour` | locations |
   |--------|----------|-----------|
   | knork  | mahogany | 2, 7      |


Thus, we've done two efficient binary searches to find the rows of interest, at locations 2 & 7.

### Column-lookup: `kind`

Similarly, the index works well for filtering `WHERE kind = 'knork'`. The process for finding locations 2, 4, & 7 looks remarkably familiar, just one step shorter:

1. Binary search the `kind` column to find these matching entries.

   | `kind` | `colour` | locations |
   |--------|----------|-----------|
   | knork  | mahogany | 2, 7      |
   | knork  | salmon   | 4         |

The index is applicable for searching by `kind` by _just_ doing the first step of the search process, and ignoring that the `colour` column even exists.

### Column-lookup: `colour`

However, it doesn't work for `WHERE colour = 'mahogany'`: the table is **not** globally ordered by `colour`. We can see this viscerally:

| `colour`   | locations |
|------------|-----------|
| mahogany   | 5         |
| zebra      | 3         |
| mahogany   | 2, 7      |
| salmon     | 4         |
| aqua       | 1         |
| periwinkle | 6         |

That's the original 'index' table, ignoring the irrelevant (for this query) `kind` column. The `colour` column is in **total disarray**, with `mahogany` appearing both after `zebra` and before `aqua`.

Without sorted data, binary search can't help us. Without binary search, this index can do nothing!

This flat table analogy thus gives some intuition for why our colour-only query remains slow, even with the multi-column index: there's **no sorted data** for look-ups to use.

## Conceit

I've tailored the numbers here: the benchmarks above were run with PostgreSQL (PG) 17. The slow colour-only comparison looks quite different with PG 18[^benchmark], but the other two barely change:

| Query       |   PG | No index (ms) | With index (ms) | Speedup |
|-------------|-----:|--------------:|----------------:|---------|
| Both        | 17.7 |           420 |           0.009 | 46700×  |
|             | 18.1 |           399 |           0.008 | 49800×  |
| Kind-only   | 17.7 |           403 |            4.79 | 84×     |
|             | 18.1 |           386 |            3.76 | 103×    |
| Colour-only | 17.7 |           480 |         **492** | **1×**  |
|             | 18.1 |           466 |        **15.6** | **30×** |

The last row shows our colour-only query **gets faster** with the multi-column index in the newer PostgreSQL.

It is still 4× slower than the superficially-similar kind-only query, and its speedup with the index is much smaller ("only" 30× instead of 103×)... but it is clear that the multi-column index _is_ now helpful, despite our query being on the second column only.

This seemingly violates what we just learned: we can't binary search on the `colour` column with our `kind`-then-`colour` index? Has the index structure changed? Can we no longer use a sorted table analogy to guide our intuition?

No, the index data structure is the same, but Postgres 18 has [learned][skip-scan] **a 'skip scan' method** for using the index. It's a nifty optimisation that relies on the later columns not actually being random: those columns are **partially sorted**, with runs of sorted data. The flat table analogy is **still relevant** for building an intuition for this optimisation...

... But this article is already long enough, and it is easier to build a mental model starting from the stark difference visible in PostgreSQL 17, before moving on to the fancier PostgreSQL 18 behaviour.

[skip-scan]: https://github.com/postgres/postgres/commit/92fe23d93

## Conclusion

Like any index in a database, a multi-column index makes queries faster. It's an index on multiple columns, but it can even make queries only involving _some_ of those columns faster, but with differing behaviour depending on which subset of columns are involved.

Thinking about the index as an ordered table of the indexed columns' data gives some intuition for why a query with only the first indexed column is much faster than a query with the second (or later) index column.

{% include comments.html c=page.comments h=page.hashtags %}

{% comment %}

Raw data:

``` json
{
  "versions": {
    "python": "3.13.11 (main, Dec 17 2025, 20:55:16) [Clang 21.1.4 ]",
    "psycopg": "3.3.2"
  },
  "metadata": {
    "INIT": "\nDROP TABLE IF EXISTS cutlery;\nCREATE TABLE cutlery (\n  id BIGSERIAL PRIMARY KEY,\n  -- fork, spoon, knife, straw, strork, etc.\n  kind text,\n  -- silver, red, puce, etc.\n  colour text\n);\n\nINSERT INTO cutlery (kind, colour)\nSELECT random(1, 2000)::text, random(1, 2000)::text\nFROM generate_series(1, 20000000) AS t(id);\n",
    "QUERIES": {
      "Both": "SELECT * FROM cutlery WHERE kind = '17' AND colour = '630'",
      "Kind": "SELECT * FROM cutlery WHERE kind = '17'",
      "Colour": "SELECT * FROM cutlery WHERE colour = '630'"
    },
    "SCENARIOS": {
      "No index": [],
      "Kind-only": [
        [
          "CREATE INDEX idx_cutlery_kind ON cutlery (kind)",
          "DROP INDEX IF EXISTS idx_cutlery_kind"
        ]
      ],
      "Colour-only": [
        [
          "CREATE INDEX idx_cutlery_colour ON cutlery (colour)",
          "DROP INDEX IF EXISTS idx_cutlery_colour"
        ]
      ],
      "Both onlys": [
        [
          "CREATE INDEX idx_cutlery_kind ON cutlery (kind)",
          "DROP INDEX IF EXISTS idx_cutlery_kind"
        ],
        [
          "CREATE INDEX idx_cutlery_colour ON cutlery (colour)",
          "DROP INDEX IF EXISTS idx_cutlery_colour"
        ]
      ],
      "Multi-col": [
        [
          "CREATE INDEX idx_cutlery_kind_colour ON cutlery (kind, colour)",
          "DROP INDEX IF EXISTS idx_cutlery_kind_colour"
        ]
      ]
    },
    "WARMUP": 3,
    "RUNS": 15,
    "IMAGES": [
      "postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4",
      "postgres:18.1@sha256:3bb77a07b9ce8b8de0fe6d9b063adf20b9cca1068a1bcdc054cac71a69ce0ca6"
    ]
  },
  "results": [
    {
      "image": "postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4",
      "results": [
        {
          "index": "No index",
          "query": "Both",
          "min": 420.161,
          "median": 446.654,
          "max": 506.328,
          "times": [
            420.161,
            421.122,
            421.744,
            424.498,
            425.484,
            435.667,
            439.886,
            446.654,
            459.389,
            469.708,
            470.789,
            471.997,
            487.47,
            489.089,
            506.328
          ]
        },
        {
          "index": "No index",
          "query": "Kind",
          "min": 403.382,
          "median": 418.239,
          "max": 451.991,
          "times": [
            403.382,
            403.414,
            403.747,
            405.2,
            405.926,
            413.997,
            416.724,
            418.239,
            418.317,
            420.625,
            421.971,
            427.609,
            434.421,
            449.174,
            451.991
          ]
        },
        {
          "index": "No index",
          "query": "Colour",
          "min": 479.943,
          "median": 489.308,
          "max": 586.41,
          "times": [
            479.943,
            480.285,
            482.878,
            484.363,
            485.023,
            489.057,
            489.278,
            489.308,
            494.571,
            495.864,
            506.158,
            509.344,
            511.78,
            533.864,
            586.41
          ]
        },
        {
          "index": "Kind-only",
          "query": "Both",
          "min": 4.78,
          "median": 5.008,
          "max": 5.523,
          "times": [
            4.78,
            4.835,
            4.888,
            4.89,
            4.934,
            4.948,
            4.981,
            5.008,
            5.02,
            5.068,
            5.12,
            5.126,
            5.244,
            5.289,
            5.523
          ]
        },
        {
          "index": "Kind-only",
          "query": "Kind",
          "min": 4.419,
          "median": 4.483,
          "max": 5.33,
          "times": [
            4.419,
            4.452,
            4.458,
            4.46,
            4.467,
            4.467,
            4.482,
            4.483,
            4.525,
            4.579,
            4.584,
            4.67,
            4.833,
            4.993,
            5.33
          ]
        },
        {
          "index": "Kind-only",
          "query": "Colour",
          "min": 482.985,
          "median": 490.615,
          "max": 564.703,
          "times": [
            482.985,
            483.579,
            484.825,
            485.18,
            485.99,
            487.025,
            490.095,
            490.615,
            494.124,
            505.781,
            516.178,
            516.692,
            517.171,
            546.445,
            564.703
          ]
        },
        {
          "index": "Colour-only",
          "query": "Both",
          "min": 4.598,
          "median": 4.653,
          "max": 7.747,
          "times": [
            4.598,
            4.605,
            4.621,
            4.626,
            4.633,
            4.64,
            4.646,
            4.653,
            4.667,
            4.688,
            4.709,
            4.977,
            4.99,
            5.684,
            7.747
          ]
        },
        {
          "index": "Colour-only",
          "query": "Kind",
          "min": 401.731,
          "median": 418.591,
          "max": 442.959,
          "times": [
            401.731,
            403.643,
            404.225,
            408.567,
            410.353,
            414.352,
            415.292,
            418.591,
            418.796,
            421.065,
            421.107,
            425.041,
            434.063,
            440.358,
            442.959
          ]
        },
        {
          "index": "Colour-only",
          "query": "Colour",
          "min": 4.648,
          "median": 5.981,
          "max": 8.158,
          "times": [
            4.648,
            4.826,
            5.047,
            5.105,
            5.222,
            5.64,
            5.866,
            5.981,
            6.065,
            6.091,
            6.118,
            6.308,
            6.997,
            7.957,
            8.158
          ]
        },
        {
          "index": "Both onlys",
          "query": "Both",
          "min": 1.28,
          "median": 1.34,
          "max": 2.047,
          "times": [
            1.28,
            1.308,
            1.313,
            1.322,
            1.334,
            1.335,
            1.339,
            1.34,
            1.344,
            1.352,
            1.36,
            1.367,
            1.737,
            1.81,
            2.047
          ]
        },
        {
          "index": "Both onlys",
          "query": "Kind",
          "min": 5.207,
          "median": 6.412,
          "max": 7.456,
          "times": [
            5.207,
            5.409,
            5.732,
            5.751,
            5.903,
            5.905,
            6.074,
            6.412,
            6.582,
            6.766,
            7.134,
            7.168,
            7.271,
            7.423,
            7.456
          ]
        },
        {
          "index": "Both onlys",
          "query": "Colour",
          "min": 4.95,
          "median": 5.79,
          "max": 6.963,
          "times": [
            4.95,
            5.042,
            5.12,
            5.16,
            5.243,
            5.468,
            5.695,
            5.79,
            6.164,
            6.442,
            6.461,
            6.464,
            6.831,
            6.844,
            6.963
          ]
        },
        {
          "index": "Multi-col",
          "query": "Both",
          "min": 0.009,
          "median": 0.01,
          "max": 0.014,
          "times": [
            0.009,
            0.009,
            0.01,
            0.01,
            0.01,
            0.01,
            0.01,
            0.01,
            0.01,
            0.01,
            0.011,
            0.012,
            0.013,
            0.014,
            0.014
          ]
        },
        {
          "index": "Multi-col",
          "query": "Kind",
          "min": 4.787,
          "median": 5.569,
          "max": 7.896,
          "times": [
            4.787,
            4.818,
            5.131,
            5.207,
            5.273,
            5.45,
            5.519,
            5.569,
            5.668,
            6.062,
            6.291,
            6.537,
            7.633,
            7.746,
            7.896
          ]
        },
        {
          "index": "Multi-col",
          "query": "Colour",
          "min": 492.538,
          "median": 593.18,
          "max": 1350.005,
          "times": [
            492.538,
            492.738,
            493.294,
            499.08,
            551.357,
            560.234,
            585.141,
            593.18,
            722.493,
            753.176,
            770.088,
            778.463,
            897.394,
            903.072,
            1350.005
          ]
        }
      ]
    },
    {
      "image": "postgres:18.1@sha256:3bb77a07b9ce8b8de0fe6d9b063adf20b9cca1068a1bcdc054cac71a69ce0ca6",
      "results": [
        {
          "index": "No index",
          "query": "Both",
          "min": 398.779,
          "median": 427.11,
          "max": 659.264,
          "times": [
            398.779,
            404.699,
            414.322,
            417.336,
            419.93,
            421.422,
            426.474,
            427.11,
            427.522,
            431.629,
            433.965,
            435.821,
            436.444,
            537.052,
            659.264
          ]
        },
        {
          "index": "No index",
          "query": "Kind",
          "min": 386.497,
          "median": 411.136,
          "max": 509.506,
          "times": [
            386.497,
            389.611,
            401.245,
            403.152,
            404.987,
            407.947,
            408.759,
            411.136,
            417.985,
            434.354,
            435.439,
            446.025,
            452.879,
            473.377,
            509.506
          ]
        },
        {
          "index": "No index",
          "query": "Colour",
          "min": 465.962,
          "median": 479.4,
          "max": 531.278,
          "times": [
            465.962,
            468.297,
            469.077,
            469.875,
            470.086,
            471.685,
            472.974,
            479.4,
            480.709,
            481.428,
            483.966,
            484.535,
            499.099,
            500.553,
            531.278
          ]
        },
        {
          "index": "Kind-only",
          "query": "Both",
          "min": 4.057,
          "median": 4.209,
          "max": 4.946,
          "times": [
            4.057,
            4.067,
            4.087,
            4.117,
            4.142,
            4.157,
            4.159,
            4.209,
            4.243,
            4.327,
            4.364,
            4.445,
            4.494,
            4.538,
            4.946
          ]
        },
        {
          "index": "Kind-only",
          "query": "Kind",
          "min": 4.433,
          "median": 7.159,
          "max": 14.889,
          "times": [
            4.433,
            4.992,
            5.258,
            6.081,
            6.277,
            6.303,
            6.739,
            7.159,
            7.204,
            7.744,
            7.806,
            7.894,
            7.972,
            8.875,
            14.889
          ]
        },
        {
          "index": "Kind-only",
          "query": "Colour",
          "min": 490.457,
          "median": 526.997,
          "max": 603.341,
          "times": [
            490.457,
            497.029,
            499.542,
            508.969,
            510.823,
            514.785,
            517.994,
            526.997,
            533.722,
            536.644,
            548.496,
            567.942,
            579.822,
            583.16,
            603.341
          ]
        },
        {
          "index": "Colour-only",
          "query": "Both",
          "min": 4.756,
          "median": 6.55,
          "max": 10.206,
          "times": [
            4.756,
            4.83,
            5.061,
            5.646,
            5.802,
            6.498,
            6.533,
            6.55,
            6.861,
            6.914,
            7.29,
            7.68,
            8.57,
            9.761,
            10.206
          ]
        },
        {
          "index": "Colour-only",
          "query": "Kind",
          "min": 392.08,
          "median": 438.521,
          "max": 527.374,
          "times": [
            392.08,
            400.555,
            406.2,
            413.631,
            417.33,
            430.452,
            432.721,
            438.521,
            449.96,
            452.482,
            459.516,
            477.436,
            513.793,
            521.377,
            527.374
          ]
        },
        {
          "index": "Colour-only",
          "query": "Colour",
          "min": 4.407,
          "median": 4.692,
          "max": 5.497,
          "times": [
            4.407,
            4.519,
            4.621,
            4.63,
            4.632,
            4.658,
            4.684,
            4.692,
            4.722,
            4.734,
            4.735,
            4.737,
            4.835,
            5.079,
            5.497
          ]
        },
        {
          "index": "Both onlys",
          "query": "Both",
          "min": 1.317,
          "median": 1.408,
          "max": 1.49,
          "times": [
            1.317,
            1.318,
            1.332,
            1.354,
            1.354,
            1.358,
            1.368,
            1.408,
            1.412,
            1.416,
            1.43,
            1.473,
            1.486,
            1.488,
            1.49
          ]
        },
        {
          "index": "Both onlys",
          "query": "Kind",
          "min": 4.578,
          "median": 5.714,
          "max": 7.101,
          "times": [
            4.578,
            4.592,
            4.63,
            4.634,
            4.705,
            4.833,
            5.543,
            5.714,
            6.385,
            6.502,
            6.552,
            6.671,
            7.016,
            7.076,
            7.101
          ]
        },
        {
          "index": "Both onlys",
          "query": "Colour",
          "min": 4.214,
          "median": 4.736,
          "max": 6.831,
          "times": [
            4.214,
            4.245,
            4.282,
            4.453,
            4.534,
            4.703,
            4.734,
            4.736,
            4.818,
            4.869,
            4.89,
            5.478,
            6.216,
            6.381,
            6.831
          ]
        },
        {
          "index": "Multi-col",
          "query": "Both",
          "min": 0.008,
          "median": 0.009,
          "max": 0.012,
          "times": [
            0.008,
            0.008,
            0.008,
            0.008,
            0.008,
            0.008,
            0.009,
            0.009,
            0.009,
            0.009,
            0.009,
            0.01,
            0.01,
            0.011,
            0.012
          ]
        },
        {
          "index": "Multi-col",
          "query": "Kind",
          "min": 3.762,
          "median": 3.886,
          "max": 8.286,
          "times": [
            3.762,
            3.808,
            3.819,
            3.849,
            3.866,
            3.867,
            3.884,
            3.886,
            3.893,
            3.907,
            3.953,
            4.002,
            4.214,
            5.664,
            8.286
          ]
        },
        {
          "index": "Multi-col",
          "query": "Colour",
          "min": 15.644,
          "median": 16.498,
          "max": 17.212,
          "times": [
            15.644,
            15.66,
            15.753,
            15.898,
            16.033,
            16.198,
            16.27,
            16.498,
            16.661,
            16.711,
            16.806,
            16.843,
            16.861,
            16.892,
            17.212
          ]
        }
      ]
    }
  ]
}
```

{% endcomment %}

{% comment %}
### Investigation into PG behaviour

https://www.postgresql.org/docs/current/indexes-multicolumn.html

In https://github.com/postgres/postgres/commit/7adec2d5fc29036a6ce78c4f4e95f85466cb5d9a

search for `multicolumn`; found error message:

``` text
src/backend/commands/indexcmds.c:864:				 errmsg("access method \"%s\" does not support multicolumn indexes",
```

Looking at that finds:

``` c
	if (numberOfKeyAttributes > 1 && !amRoutine->amcanmulticol)
		ereport(ERROR,
				(errcode(ERRCODE_FEATURE_NOT_SUPPORTED),
				 errmsg("access method \"%s\" does not support multicolumn indexes",
						accessMethodName)));

```

``` c
	/*
	 * count key attributes in index
	 */
	numberOfKeyAttributes = list_length(stmt->indexParams);
```

``` c
src/include/nodes/parsenodes.h:3360:	List	   *indexParams;	/* columns to index: a list of IndexElem */
```

But where's the btree index? Searching for `btree` files finds: contrib/btree_gin, contrib/btree_gist, src/backend/lib/rbtree.[ch], src/include/access/nbtree.h, src/backend/access/nbtree, src/test/regress/sql/btree_index.sql

Unclear what's relevant.

Next step: look at history of that test file. Likely also contains something with multi-column-ness in it.

btree_index.sql only has one multi-column index (`btree_tall_idx`) that was introduced in 88fc71926392115cdc3672807f3903ce43d0ebcf which doesn't do anything with multi-column indices. SO, not useful.

Other tests? searching for `#multi column#test` doesn't find anything useful


Back to `indexcmds.c`

error message above is guarded by  `!amRoutine->amcanmulticol`, let's track down `amRoutine` and `amcanmulticol`.

Chain:

``` c
	accessMethodName = stmt->accessMethod;
	tuple = SearchSysCache1(AMNAME, PointerGetDatum(accessMethodName));
	accessMethodForm = (Form_pg_am) GETSTRUCT(tuple);
	amRoutine = GetIndexAmRoutine(accessMethodForm->amhandler);
    amRoutine->amcanmulticol
```

referring to (`SearchSysCache1`, `PointerGetDatum`, `GETSTRUCT` seem generic):

``` c
parsenodes.h:3358: char	   *accessMethod;	/* name of access method (eg. btree) */
pg_am.h:53:MAKE_SYSCACHE(AMNAME, pg_am_name_index, 4);
amapi.c:33:GetIndexAmRoutine(Oid amhandler)
pg_am.h:37:	regproc		amhandler BKI_LOOKUP(pg_proc);
amapi.h:232	bool		amcanmulticol;
```

(NB. `MAKE_SYSCACHE` is a macro-ish, but processed by `genbki.pl` script, likely using `Catalog.pm`.

``` c
genbki.h:127:#define MAKE_SYSCACHE(name,idxname,nbuckets) extern int no_such_variable
genbki.pl:23:use Catalog;
Catalog.pm:133:			/^MAKE_SYSCACHE\(\s*
```
)

Searching for assignments `amcanmulticol =` finds

``` c
contrib/bloom/blutils.c:117:	amroutine->amcanmulticol = true;
src/test/modules/dummy_index_am/dummy_index_am.c:289:	amroutine->amcanmulticol = false;
src/backend/access/hash/hash.c:68:	amroutine->amcanmulticol = false;
src/backend/access/brin/brin.c:258:	amroutine->amcanmulticol = true;
src/backend/access/nbtree/nbtree.c:112:	amroutine->amcanmulticol = true;
src/backend/access/gist/gist.c:70:	amroutine->amcanmulticol = true;
src/backend/access/spgist/spgutils.c:55:	amroutine->amcanmulticol = false;
src/backend/access/gin/ginutil.c:48:	amroutine->amcanmulticol = true;
```

`src/backend/access/nbtree/nbtree.c` looks useful. but unclear how an index is actually created

Let's go back to `indexcmds.c` to see if there's any function calls that look useful

``` c
indexcmds.c:1194:		index_create(rel, indexRelationName, indexRelationId, parentIndexId,
src/backend/catalog/index.c:724:index_create(Relation heapRelation,
```

`indexcmds.c` gets an `accessMethodId` parameter in `indexcmds.c`, browsing for where that's define finds BTREE_AM_OID

```c
src/include/catalog/pg_am.dat:18:{ oid => '403', oid_symbol => 'BTREE_AM_OID',
```

searching for `BTREE_AM_OID` doesn't find an obvious place that defines it... or maybe it's defined by `bthandler`

``` c
src/include/catalog/pg_am.dat:20:  amname => 'btree', amhandler => 'bthandler', amtype => 'i' },
src/backend/access/nbtree/nbtree.c:101:bthandler(PG_FUNCTION_ARGS)
```

that is what sets `amcanmulticol` above. Various `bt...` methods.

``` c
src/backend/access/nbtree/nbtree.c:128:amroutine->ambuild = btbuild;
```

`ambuild` called by `index_build` called by `index_create` see above

``` c
src/backend/catalog/index.c:3018:	stats = indexRelation->rd_indam->ambuild(heapRelation, indexRelation,
src/backend/catalog/index.c:1276:		index_build(heapRelation, indexRelation, indexInfo, false, true);
```

=> `btbuild` is a useful thing to look at

``` c
src/include/access/nbtree.h:1328:extern IndexBuildResult *btbuild(Relation heap, Relation index,
src/backend/access/nbtree/nbtsort.c:293:btbuild(Relation heap, Relation index, IndexInfo *indexInfo)
```


calls something that sounds like it's doing something useful

``` c
reltuples = _bt_spools_heapscan(heap, index, &buildstate, indexInfo);
src/backend/access/nbtree/nbtsort.c:363:_bt_spools_heapscan(Relation heap, Relation index, BTBuildState *buildstate,
```

that takes an `IndexInfo` arg, whch sounds relevant:

``` c
src/include/nodes/execnodes.h:181:typedef struct IndexInfo
	int			ii_NumIndexKeyAttrs;	/* number of key columns in index */
```

and also calls `tuplesort_begin_index_btree` and `table_index_build_scan`

```
		reltuples = table_index_build_scan(heap, index, indexInfo, true, true,
										   _bt_build_callback, buildstate,
										   NULL);

./src/include/utils/tuplesort.h:428:extern Tuplesortstate *tuplesort_begin_index_btree(Relation heapRel,
./src/backend/access/nbtree/nbtsort.c:431:		tuplesort_begin_index_btree(heap, index, buildstate->isunique,
./src/backend/access/nbtree/nbtsort.c:457:			 * tuplesort_begin_index_btree() about the basic high level
./src/backend/access/nbtree/nbtsort.c:472:			tuplesort_begin_index_btree(heap, index, false, false, work_mem,
./src/backend/access/nbtree/nbtsort.c:1883:	btspool->sortstate = tuplesort_begin_index_btree(btspool->heap,
./src/backend/access/nbtree/nbtsort.c:1909:			tuplesort_begin_index_btree(btspool->heap, btspool->index, false, false,
./src/backend/utils/sort/tuplesortvariants.c:358:tuplesort_begin_index_btree(Relation heapRel,
```

`tuplesort_begin_index_btree` in `src/backend/utils/sort/tuplesortvariants.c` sets `base->nKeys = IndexRelationGetNumberOfKeyAttributes(indexRel);`

``` c
	/*
	 * The sortKeys variable is used by every case other than the hash index
	 * case; it is set by tuplesort_begin_xxx.  tupDesc is only used by the
	 * MinimalTuple and CLUSTER routines, though.
	 */
	int			nKeys;			/* number of columns in sort key */
```

and also
``` c
	base->comparetup = comparetup_index_btree;
	base->comparetup_tiebreak = comparetup_index_btree_tiebreak;
```

Those functions iterate over the

`_bt_build_callback` calls through to `_bt_spool` which calls `tuplesort_putindextuplevalues` putting things into a heap

after `_bt_spools_heapscan`, `btbuild` calls `_bt_leafbuild` that finishes the sort of tuples and calls `_bt_load`

building index tuples:

- `ItemPointerData` is the "TID" https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/include/storage/itemptr.h#L36-L40
- `IndexTupleData`/`IndexTuple` https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/include/access/itup.h#L22-L51
- `index_form_tuple_context` https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/backend/access/common/indextuple.c#L52-L68

Querying:

- `_bt_first` https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/backend/access/nbtree/nbtsearch.c#L887
- `IndexScanDescData` (particularly `keyData` storing `ScanKey`s) https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/include/access/relscan.h#L143
- `ScanKeyData` https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/include/access/skey.h#L64-L73
- `_bt_checkkeys` seems key (hah) https://github.com/postgres/postgres/blob/6dfce8420e99d8cf41ffb7da698caee57fd73eb7/src/backend/access/nbtree/nbtutils.c#L2150

{% endcomment %}

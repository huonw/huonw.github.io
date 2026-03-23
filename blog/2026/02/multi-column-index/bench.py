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
FROM generate_series(1, 20000) AS t(id);
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

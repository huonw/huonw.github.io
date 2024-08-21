---
layout: default
title: "Async hazard: mmap is secretly blocking IO"

description: >-
    Memory-mapping a file is convenient, but it's a hazard when used with async/await concurrent code: it means a "simple" memory index does blocking IO.

js:
    - "/js/plotly.js"
no_jquery: true

comments:
---

Memory mapping a file for reading sounds nice: turn inconvenient read calls and manual buffering into just simple indexing of a memory... but it does blocking IO under the hood, turn a `&[u8]` byte arrays into an async hazard and making "concurrent" async code actually run sequentially!

Code affected likely runs slower, underutilises machine resources, and has undesirable latency spikes.

I've done some experiments in Rust that show exactly what this means, but I think this applies to any system that doesn't have special handling of memory-mapped IO (including Python, and manual non-blocking IO in C).

## I want numbers

I set up [some benchmarks] that scan through 8 files, each 256 MiB, summing the value of every 512th byte. This is an uninteresting task, but it is designed to maximise IO usage and minimise everything else. This is thus a worst case, the impact on real code is unlikely to be quite this severe!

[some benchmarks]: https://github.com/huonw/async-mmap-experiments

{% include plotly.html height="300px" caption="Results of 100 iterations of the benchmarks on an M1 Macbook Pro, one plotted point per iteration, with a cold file system cache." data="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" %}

There's 6 configurations, using all combinations of how files are read and what concurrency is used.[^benchmark-details]

[^benchmark-details]: I have a script that repeatedly measures the time to scan through all 2GiB, in each configuration. Before each measurement, it runs [`purge`](https://www.manpagez.com/man/8/purge/) to drop any file system caches and thus run with a cold cache.


For reading files, there's two dimensions:

1. conventional IO: using explicit `read` calls.
2. memory-mapped IO: using [the `memmap2` library](https://crates.io/crates/memmap2).

For concurrency, there's three:

1. `async`/`await`: using [the Tokio library](https://tokio.rs/)[^tokio-details] in single-threaded mode[^tokio-single-threaded].
2. synchronously, with 8 threads: [spawning a thread](https://doc.rust-lang.org/stable/std/thread/fn.spawn.html) per file.
3. synchronously, with 1 thread: a baseline using a single thread to read sequentially.

[^tokio-details]: The Tokio benchmarks iterate over each file concurrently with [a `join_all` call](https://docs.rs/futures/0.3.28/futures/future/fn.join_all.html). This uses [the `tokio::fs::File` type](https://docs.rs/tokio/1.28.2/tokio/fs/struct.File.html) for "conventional IO". Note: this uses a thread-pool in the background, because it seems like there's limited support for truly asynchronous file IO, but the key is the API exposed, using `async`/`await`.

[^tokio-single-threaded]: The benchmarks use the [single threaded runtime](https://docs.rs/tokio/1.28.2/tokio/runtime/struct.Builder.html#method.new_current_thread) to make the problem as obvious and clear as possible: using a multi-thread runtime may disguise the consequences of mmap's blocking IO by smearing it across multiple threads.

The results[^table] are clear: using memory mapped IO with `async`/`await` seems to be **using no concurrency**: the clusters of dots are near-identical for the first two rows! An **explicitly-sequential single thread** takes 2.5 to 3 seconds to scan all 2GiB with memory-mapped IO, and the "concurrent" `async`/`await` version looks identical. By comparison, using memory-mapped IO on 8 full threads is far faster, around 0.75 to 0.8 seconds.

[^table]: Here's a table with the full results, including both cold and warm file system caches, taking the minimum value of each benchmark (that is, the most favourable observation):

    | Concurrency                   | IO           | Cold (s) | Warm (s) |
    |-------------------------------|--------------|----------|----------|
    | Async                         | Mmap         | 2.5      | 0.12     |
    | Async                         | Conventional | 0.62     | 0.22     |
    | Sync <small>8 threads</small> | Mmap         | 0.75     | 0.049    |
    | Sync <small>8 threads</small> | Conventional | 0.62     | 0.063    |
    | Sync <small>1 thread</small>  | Mmap         | 2.5      | 0.12     |
    | Sync <small>1 thread</small>  | Conventional | 0.67     | 0.14     |




Meanwhile, using conventional IO behaves more like we'd hope: using either form of concurrency is **noticeably faster** than running sequentially. Using either `async`/`await` or operating system threads results in reading all files in less than 0.65 seconds[^maxed-out], while the sequential single-threaded version takes only a bit longer (0.7s) but with little overlap in the distributions.

[^maxed-out]: I think this is maxing out the machine's SSD bandwidth, at around 3300 MiB/s, hence it's not much faster than the single-threaded version.

## What's going on?

Operating systems generally distinguish between bytes in RAM and files stored on disk. Reading a file is a dedicated operation that slurps bytes from disk into an array in memory. But there's more shades of gray: [the `mmap` Unix system call](https://en.wikipedia.org/wiki/Mmap) (or equivalent on other platforms) blurs this disk vs. memory distinction by setting up "memory mapped IO".

The `mmap` operation allocates a range of (virtual) memory to a chosen file, making that memory "contain" the file: reading[^writing] the first byte in memory gives the value of the first byte of the file, as does the second, and so on. The file essentially acts as a normal `&[u8]` array that can be indexed and sliced.

[^writing]: This article focuses on my observations of using mmap for reading a file, not writing. As I understand it, writing comes with its own problems, potentially including things like unclear persistence guarantees. But I'm not an expert nor have I investigated.

{% highlight rust linenos %}
let file = std::fs::File::open("data.bin")?;
let mmapped = unsafe { memmap2::Mmap::map(file)? };

let first_byte: u8 = mmapped[0];
println!("File starts {first_bytes}");

let central_bytes: &[u8] = &mmapped[1200..1300];
println!("File contains {central_bytes:?}");
{% endhighlight %}

This sounds a lot like what one would get by manually allocating a memory array as a buffer, seeking within the file, reading the file to fill that buffer, and then accessing the buffer... just without all the book-keeping. What's not to like?

## Under the hood

To make this work, the operating system has to do magic.

One possible implementation might be to literally have the operating system allocate a chunk of physical memory and load the file into it, byte by byte, right when `mmap` is called... but this is slow, and defeats half the magic of memory mapped IO: manipulating files without having to pull them into memory. Maybe the machine has 4GiB of RAM installed, but we want to manipulate a 16GiB file.

Instead, operating systems will use the power of **virtual memory**: this allows some parts of the file to be in physical memory, while other parts are happily left on disk, and different parts can be paged in and out of memory as required. Sections of file are only loaded into memory **as they are accessed**.

{% highlight rust linenos %}
let mmapped: Mmap = /* map some file into memory */;

let index = 12345;
let byte_of_interest = mmapped[index];
println!("byte #{index} has value {byte_of_interest}");
{% endhighlight %}

That indexing accesses the 12 345th byte of the file. On the first access, there'll be a **page fault**, and the operating system takes over: it loads the relevant data from the file on disk into actual physical memory, meaning the data is now available directly in normal RAM. This includes loading a small surrounding region—a page—which means future accesses to nearby addresses are fast.

While loading, the thread and its code will be **blocked**: the thread will be descheduled and won't make further progress, because the next lines need the byte value to do their work.

Once loaded, the page of the file will be cached in memory for a while, and during that time any further accesses to addresses in the page will be fast, straight from memory. Depending on system memory usage and other factors, the operating system might then decide to evict the page from memory, freeing space for something else. Accessing it after eviction will require reloading from disk, with the same blocking behaviour and the cycle repeats.

In our application code, all this magic is packaged up into the simple indexing: `byte_of_interest = mmapped[index]`. The separate "already in memory" (fast) and "load from disk" (slow) cases are invisible[^timing] in the code. In either case, we start with our memory address and end up with byte value.

[^timing]: The cases are invisible except through side-channels like timing the operation, observing memory usage stats, or page allocation tables. I'm not counting them.

## Losing the thread

This magic is why our concurrency doesn't work. The `async`/`await` construct is co-operative scheduling, with a "executor" or "event loop" that manages many tasks, swapping between them as required... but this swapping is **only possible at explicit `await` points**. If a task runs for a long time or is "blocked" without an `await`, the executor won't be able to preempt it to run another task. Others have [written more about this blocking pitfall, far more knowledgeably than I][blocking].

[blocking]: https://ryhl.io/blog/async-what-is-blocking/

Remember that the code just looks like `let byte_of_interest = mmapped[index];`? There's **no `await`**, so the `async`/`await` executor **cannot swap to another task**. Instead, the operation blocks and deschedules the whole thread... But the executor is just normal code using that thread too, so the very thing that coordinates the concurrency is descheduled and can't do any other work.

This is different to proper async IO, the individual task will still need to wait for the data to be read, but `await`s mean the executor can swap to another task while that happens: concurrency!

{% highlight rust linenos %}
let mut file: tokio::fs::File = /* some file */;
let mut buffer: [u8; N] = [0; N];
file.read(&mut buffer).await?; // crucial await
{% endhighlight %}

## At a distance

The **most subtle** part of this hazard to me is that the memory-mapped file **looks like a normal buffer in memory**. Code is likely to be implicitly assuming that indexing a `&[u8]` is fast, and does not secretly read a file.

For instance, `memmap2::Mmap` derefs [to `[u8]`][deref], meaning we can take `fn f(b: &[u8]) { ... }`, and call it like `f(&mmapped)`. That function just sees `b: &[u8]`, and won't have _any_ idea that indexing `b` might do blocking IO. It won't know that it needs to take care with any co-operative concurrency it is performing.

[deref]: https://docs.rs/memmap2/0.6.2/memmap2/struct.Mmap.html#impl-Deref-for-Mmap

Rust is just the demonstration here, **this applies universally**: [Python's `mmap`][python-mmap] explicitly says "behave like ... `bytearray`", while the C/POSIX `mmap` function returns `void *` (same as `malloc`). The whole point of memory-mapping is **pretending a file is a byte array**, and that's what bites us here!

[python-mmap]: https://docs.python.org/3/library/mmap.html


## Caching: Cha-ching!

We've seen above that the problem is when data has to be loaded from disk into memory. What happens if the data is **in memory already**?  We might expect memory-mapped IO to run much faster in that case, since it's theoretically just accessing normal memory, straight from RAM.

This version of the benchmark times how long it takes to run the same task, immediately after doing the cold version we saw above, without purging caches.

{% include plotly.html height="300px" caption="100 iterations of the same benchmark as above, but with a warm file system cache." data="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" %}

Our theory was right, it is **much faster**: with a cold cache, we were seeing memory-mapped IO on a single thread take 2.5s to read 2GiB. Now it takes 0.12s, 21&times; quicker, with `async`/`await` or without[^table].

There's some other notable observations about running with a warm cache:

- Memory-mapped IO is faster than conventional IO. I imagine because there's less overhead: for conventional IO, there's an extra `memcpy` of data from the operating system page cache into the buffer passed into the `read` call. Using Tokio and `async`/`await` has even more overhead, likely because there's synchronisation overhead with the thread-pool that has to be used for asynchronous file IO.
- Asynchronous and single-threaded sequential memory-mapped IO still take the time same time as each other, same as with a cold cache... just both are now fast.
- If you want speed, using multiple threads is handy: memory-mapped IO is achieving "file" IO speeds of  ~41GiB/s, by reading 2GiB in 49ms.
- This is likely system-dependent: I was running on arm64 macOS, and other systems may see different results.

## More questions

I've done some experiments here, putting the "science" in "computer science", and of course there's more questions: I don't know the answers!

1. How does this manifest across **other platforms**, beyond arm64 macOS? (Hypothesis: similar on all platforms.)
2. Does the **type of disk** backing the files influence behaviour? (Hypothesis: yes, I'd expect running this on a high-latency disk like a spinning-rust HDD to show even worse blocking behaviour than the SSD used here, as each thread will be blocked for longer.)
3. Does **[prefetching] via CPU instructions** help mitigate the problems? (Hypothesis: not sure. I have no idea if running a prefetch instruction on a memory-mapped address will cause the page to be loaded in the background. One may have to prefetch many, many loop iterations in advance, since this is reading all the way from disk, not just from RAM to CPU cache, for which prefetching is often used.)
4. How do **other `mmap`/`madvise` options** influence this (for instance, `MADV_SEQUENTIAL`, `MADV_WILLNEED`)? (Hypothesis: these options will make it more likely that data is pre-cached and thus fall into fast path more often, but without a guarantee.)
5. What about **[`readahead`][readahead]**? (Hypothesis: making the fast path more likely but not guaranteed, similar to the previous point.)

[prefetching]: https://en.wikipedia.org/wiki/Cache_control_instruction#Prefetch
[readahead]: https://en.wikipedia.org/wiki/Readahead

## Conclusion

Accessing files via memory mapped IO makes for a very convenient API: just read a byte with normal indexing. However, it's **error-prone** when used with co-operatively scheduled concurrency, like `async`/`await` in Rust or Python, or even "manual" non-blocking IO in C:

- If the data isn't available in memory yet, the operating system will have to **block the thread** while reading from disk, and there's no `await`s to allow the `async` executor to run another task.
- Thus, heavy use of `mmap` can potentially be **as slow as sequential code**!
- It's a **hazard at a distance**: a memory-mapped file can be coerced to a look like a normal byte array (`&[u8]`, `bytearray`/`list[int]`, or `void *`/`char *`) and passed deep into the async code before being indexed.
- If data is **cached** by the operating system, `mmap` has less overhead than conventional IO and can be a little faster (on my system).


<script id="plotly-template" type="application/zlib">
eJztWutu4ygUfhf/2kpoZPC9r1JVI2KTxCoxWYy3TaO8+56DISGXdkeabppRLNWqgz/O+TgX7tuo4YZHj9toxnX0+LSNhNZK/3zDolpJBYWRXsz+SnJi/x6iHXGYzaeYFdcvQiNEtp04hbIkJfZJ2UNEote2McvoMf6RQc01N0boDqvMWylXqoHqkfpHaMk3AO7bdyigMbwp2Tat2WBNtoOqZrNGLLZl90zw/1pJ17BvJjQSQVY1/BDGcuL8re1RrugaZHXZmiRa6Lbx316XrRFQFuJ92artlL4E7g3X5mMNO7TVzVBxRnN2siZbKq3WUqBPnpzjbMBuIzVYYd5hULutXz4ij9+kAE+W43uPfhxM3zbCfXVyWEDjoNtSUZ1Rg74iDyukr7kENk9P8Q+QbSOWQLRmD9EzwbKcFWkWV2WcVIxmeeUwKaEZSalDUZalVUyrPC7KNKFJMaLSAkKfZIVHlSVLMlallBZ5WsT5iCooYSUpmEOxQFuJ2kdUVZAkJqVHoZJQ6QiioA5RlUdZPdler0NlMWEFqTz7NFCGyh2qAPaMlKVDZWH7WJY5Q8QJYTkpvMbsWCFzKOAFxsi9JT4wKrixyEnueeXVsUpvekZoXJAicbAiMClq9jBwUZKRynuyDJsIij0sIzQHicxbttzrG63rcTkB/4HXvdojnUmWeBxYDZpNy7GtdB9VaHTsB1kMH54PWeDCPkiBoB+7bkIeqUdCS8HNiq+nnJxy8p5y0od9kAILOSXBlAR3mAQQ+DYN2t6ohearkyn/70/hD5KP9LBmSrgp4e4q4YLQP0mFaW00ZcR9Z0S4TFqJfplcc3hwdJxepLDmulZKN71lcbTv9T+zOdA5cLCMWjHufA1GwfC8aEGa0YM4wAGAQEhqHLJPxvHrUvccAj7OoVc25TcbwEWT+xWs+7+ZV7AF4EoWQt0CMaQRspI3QUqGnGDOPFNvt8DLMQm4Xdq0/xZqh037sOA23OmpBOxwicP15hbYeSqW3aDnvBbTtHCaFt7TtNCHPaaA4TPpEkBI2ft9iPNTSIgYfNLYnoSdnlSOZ2iYbUvBmzG9L8mhZULsg5HwqRzHdeS3e0Ys30BeIZp3nTLctKprxJwP0ljeXGv1GirLC/Aa6MIYgPo4s0Op3bCaCY1p2hvd1iZyaenPGa/ULYVdwTbqxd+D6EzL5dQxTB3DtTuGQ/St2m7opxCcQvC6Iej7w1eOk8QxDkADBdKF7VtHs1FoA7NeH0tKZAss4tSXIMOiDCCUVU5OtS8CUpTFpDpIpiAEbEDRPB4UE/fsUTGIQZV0X5HGgCghYmNr12iuOvPp7SO7DtxGs8XZVRX+cnZVRfKuOR6Fj+4C9Uv1itV6v1MxFnTN/vcwG7rWnAyuMEaP5wszYcdnLtsFDFqRFHOz/+oOImqpetHjELnma6F/nvNeS2WC4gs03aIJh+3FAK9+nP3VCzvYKsTu92Pc0GovB32mWPMGerSvU7fD9YwYJyxvXuyM1y8LrYZPPXVJN5b5+cDHTA7iQydf5Eeid6HVuSCgvfmj2L7/QWwxJpaQGuFEFCe+H81DD1NeP6cECWrNa3eyh9f69qvl4B7elyTL1TKv/tKk2+fa+d7sb8vHV+Om4Aa6TjWfR48UvfDfyXQLdHa7fwEhtg6y
</script>

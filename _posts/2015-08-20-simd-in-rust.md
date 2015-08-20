---
layout: default
title: SIMD in Rust
draft: true
---

A new scheme for SIMD in [Rust] is available in the latest nightly
compilers, fresh off the builders (get it while it's hot!).

For the last two months, I've been interning at Mozilla Research,
working on improving the state of [SIMD] parallelism in [Rust]. The
result so far is a compiler with low-level support (the first
implementation just landed as [#27169][PR27169]), and an
[in-progress library][simdcrate] that provides a mostly-safe but
low-level interface to that core functionality.

My work is aiming to be the groundwork for things to be built-on,
enabling more interesting functionality by providing the necessary
tools, not being that goal functionality itself.

[SIMD]: https://en.wikipedia.org/wiki/SIMD
[Rust]: https://www.rust-lang.org/
[RFC1199]: https://github.com/rust-lang/rfcs/pull/1199
[PR27169]: https://github.com/rust-lang/rust/pull/27169
[Issue27731]: https://github.com/rust-lang/rust/issues/27731
[simdcrate]: https://github.com/huonw/simd
[simd.js]: https://01.org/node/1495
[simd.js-benches]: https://github.com/tc39/ecmascript_simd/tree/7270420f2f4bd337985307fc46a627c94bd1059e/src/benchmarks
[std_os]: http://doc.rust-lang.org/std/os/
[bgame]: http://benchmarksgame.alioth.debian.org/
[nbody]: http://benchmarksgame.alioth.debian.org/u64/performance.php?test=nbody
[fannkuch-redux]: http://benchmarksgame.alioth.debian.org/u64/performance.php?test=fannkuchredux
[spectral-norm]: http://benchmarksgame.alioth.debian.org/u64/performance.php?test=spectralnorm
[simd-benches]: https://github.com/huonw/simd/tree/master/benches
[simd-examples]: https://github.com/huonw/simd/tree/master/examples
[cargo1137]: https://github.com/rust-lang/cargo/issues/1137

## Why care?

SIMD (Single Instruction Multiple Data) is a way to get data
parallelism on a lot of modern hardware: CPUs have instructions that
will operate on vectors of multiple values in a single call, e.g. most
x86 CPUs offer the `addps` and `mulps` instructions to do four
single-precision floating point additions (multiplications,
respectively) in parallel, by operating on two 128-bit registers.

{% include image.html src="vector.png" %}

Parallelism is the key word here: clock speeds have mostly stabilised
on modern CPUs and we're no longer getting the "automatic" performance
gains that have historically occurred with CPU upgrades. Instead, CPU
manufacturers are throwing extra die-space/power at parallelism: more
cores, more (integrated) GPU[^gpu], and more SIMD. Hence, applications that
care about performance and want to exploit every inch of the
available hardware need to care about SIMD.

[^gpu]: GPU programming is sometimes described a form of SIMD too (or
        SIMT: Single Instruction Multiple Threads), so, to be clear:
        when I say "SIMD" I mean "SIMD on the CPU".

Rust is a pretty good fit for many of the headline examples of such
applications, which are traditionally written in C/C++ (or Fortran,
for the last):

- media codecs (audio, video, images)
- games/things that do a lot of 3D graphics manipulation
- numerical software (data processing (big or not), simulations etc.)

The general goal with these is to push as much onto the GPU as
possible, however this can be difficult, and is not a panacea. One
difficulty is that the the nature of GPUs means they are a restrictive
programming model (even compared to SIMD) so some workloads are
fundamentally unsuited to them, by, for example, not being able to
saturate all execution units: GPUs are generally several times slower
than CPUs at straight-line code, so exploiting their parallelism is
important.

## SIMD is like an onion

Layers!

### Long vs. Short

There's two broad classifications of vector operations:

- short vector, computing with vectors of (short) fixed length,
  e.g. doing 4 float additions at once (`addps`)
- long vector, computing with vectors of arbitrary length
  e.g. computing the sum of some long list of numbers (`numpy.sum`)

Everything one can do with short-vectors one can also do with long
vectors, but the former is still important: it's what CPUs work with
directly and hence has the most control. In fact, if you look inside a
long vector library you're likely to find short vector manipulations.

Long vectors are generally more removed from the machine, with large
dynamic allocations and libraries which one usually relies on to make
the right choice for achieving an operation as fast as possible, while
the short vectors are often used explicitly in places that care about
the machine code down to the level of individual instructions.

I'm only focusing on the hardware, and so only the short-vector area.

### Common vs. Platform-specific

That's not the only layering: there's a common core of operations that
is widely supported by most architectures with SIMD operations, and
then there's a variety of instructions that aren't found everywhere.

The compiler doesn't care about this, but my `simd` crate does: it
tries to provide a consistent API for the cross-platform
functionality, and then opt-ins for platform specific things. The
cross-platform API is based on the
[work on SIMD in JavaScript][simd.js]: they've abstracted out a basic
set of operations that generally work efficiently, or are extremely
useful, everywhere. It definitely doesn't cover everything, but it
does go a long way.

When that isn't enough, there's glob imports. A limited-but-increasing
amount of the platform-specific functionality is exposed via
submodules of the `simd` crate, allowing one to opt-in to
non-portability in a manner similar to [`std::os`][std_os]. For
example, the SSSE3 instruction `pshufb` is exposed as the
`shuffle_bytes` method on traits in `simd::x86::ssse3`:

{% highlight rust linenos=table %}
pub fn shuffle(x: u8x16, y: u8x16) -> u8x16 {
    use simd::x86::ssse3::*;

    x.shuffle_bytes(y)
}
{% endhighlight %}

This isn't entirely portable at the moment: it requires *some* level
of SIMD support in hardware, and requires the `simd` library to have
support for the platform. In particular, ARM and i686 (i.e. x86) CPUs
aren't guaranteed to have SIMD instructions, so one must opt-in via
the `-C target-feature=+neon` (respectively `-C target-feature=+sse2`)
argument to the compiler[^cargo]. Also, I haven't tried to implement any for
PowerPC or MIPS, focusing only on x86, ARM and AArch64 (ARMv8-A's
64-bit architecture).

[^cargo]: Passing the `-C target-feature` flag to a whole compilation
          with `cargo` is somewhat annoying at the moment. It requires
          a custom target spec or intercepting how `rustc` is called
          via the `RUSTC` environment variable (for my own
          experiments, I'm doing the latter: pointing the variable to
          a shell script that runs `rustc -C target-feature='...'
          "$@"`). This is covered by [#1137][cargo1137].

## Benchmarks

Does this help? Yes! SIMD code in Rust can be several times faster
than scalar code, and is comparable and even ahead of using the
intrinsics in Clang. GCC seems to still have a significant edge over
Rust/LLVM (`rustc`'s optimiser) in some cases, but not in others.

I wrote a collection of microbenchmarks comparing the new SIMD
functionality to scalar Rust code, and to similar implementations in
C/C++:

- operations on 4×4 `f32` matrices (only SIMD Rust vs. scalar Rust)
    - inversion
    - multiplication
    - transposition
- some benchmarks from [the Benchmark Game][bgame], where the fastest
  programs use explicit SIMD:
    - [nbody] (fastest on single-core x86-64 is C)
    - [fannkuch-redux] (C++)
    - [spectral-norm] (C)

I adapted the inverse and multiply comparative benchmarks from
[ecmascript_js][simd.js-benches] into Rust microbenchmarks, and
translated the fastest benchmark game programs into Rust. I used the
original implementations of those fastest programs for comparison and
the fastest Rust programs (none of which use explicit SIMD) as a
baseline, after disabling threading. All of this Rust code is
included as [examples][simd-examples] or [benchmarks][simd-benches] in
the `simd` repository.

The Rust code is quite portable. The matrix operations use only the
cross-platform API and so work on x86, ARM and AArch64 right now. The
nbody and spectral-norm benchmarks require `f64`s (aka `double`s)
which are only supported by x86-64 & AArch64 hardware. The
fannkuch-redux benchmark requires conditionally defining a single
operation based on the platform, which takes only a few lines on each
listed platform.

{% include image.html src="chart-x86-64.png" caption="Benchmarks on x86-64 (Intel i7-4900MQ). The Rust code was compiled with `-C opt-level=3`, the C/C++ with `-O3`. SSSE3 was enabled for fannkuch-redux only." %}
{% include image.html src="chart-aarch64.png" caption="Benchmarks on AArch64 (Google Nexus 9). The Rust code was compiled with `-C opt-level=3`." %}
{% include image.html src="chart-arm.png" caption="Benchmarks on ARM (Google Nexus 5). The Rust code was compiled with `-C opt-level=3 -C target-feature=+neon`." %}

Compiler versions:

- `rustc 1.4.0-dev (02e97342c 2015-08-17)`
- `Ubuntu clang version 3.6.0-2ubuntu1 (tags/RELEASE_360/final) (based on LLVM 3.6.0)`
- `gcc (Ubuntu 4.9.2-10ubuntu13) 4.9.2`

## The Future

My long-term goal is to have `simd` provide the common cross-platform
API, with extension traits giving access to the platform-specific
instructions. All of this will have as thin an interface to as
possible: the vast majority of functions correspond to one
instruction.

I'm not personally planning to build long-vector functionality on top
of the improved short-vector functionality, but it is certainly
something that would be very cool to see.

One major missing piece of this new SIMD support in Rust is how to
handle run-time determination of SIMD functionality: it's relatively
common to have an algorithm with multiple implementations for
different levels of SIMD support, with a run-time switch to choose the
fastest one supported by the CPU being used. For example, x86-64 CPUs
are only guaranteed to support SSE2, but there's things beyond that
with more functionality and even longer SIMD vectors (Intel's new
AVX512 has 512-bit vectors). I've got some vague ideas in this area,
but nothing concrete yet.

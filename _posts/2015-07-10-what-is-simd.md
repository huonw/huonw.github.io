---
layout: default
title: "What is SIMD?"
---

I'm currently in San Francisco doing an internship at Mozilla
Research, working on creating functionality for SIMD in the Rust
programming language.

(This post is designed to describe what I'm doing for people not
necessarily familiar with programming or SIMD.)

## What is SIMD?

SIMD stands for "Single Instruction, Multiple Data", and refers to
functionality that a lot of computer hardware has for operating on
multiple numbers at once. (Essentially 100% of all desktops and
laptops and many modern phones have support for it.)

At a high-level, computers only operate on numbers. A program running
on the computer will be executing sequences of instructions like

- add *x* and *y*
- multiply the result and *z*,
- store that number to location *p*,
- repeat (until it's been done 100 times).

Usually each instruction is a simple operation. If boxes are numbers,
the first two steps above (which are run 100 times) might look like:

{% include image.html src="scalar2.png" alt="a diagram of a scalar (x + y) * z, where each operand contains one value" %}

Each operation is working with just two numbers... but imagine if we
could instead do the same operation to many pairs at the same time:
things would go faster.

This is exactly what SIMD offers. The operation instead looks like:

{% include image.html src="vector.png" alt="a diagram of a vector (x + y) * z, where each operand contains four values" %}

If we're doing 4 things at once, hopefully it is about 4 times faster!
(We'd only have to repeat that 25 times to do the whole sequence
above.)

Doing arithmetic in parallel is definitely useful, but one of the more
interesting parts of SIMD is how it allows doing relatively
complicated rearragements of data efficiently. SIMD vectors can be
shuffled, swizzled, blended, permuted...

{% include image.html src="swizzle.png" alt="a diagram of a vector swizzle from x y z w to y w z x" %}

These shuffles allow super-linear speed-ups: even if the computer can
only do 4 things at once, shuffles mean some operations can become 5
or more times faster!

## Why care about SIMD?

The SIMD operations allow a pile of common operations to be performed
much faster, allowing software to be snappier, smoother and use less
battery.

There are a few common uses for SIMD:

- rendering graphics/text to your screen, which often involves doing
  the exactly same relatively simple arithmetic operations a lot (your
  browser is probably using SIMD to display this page).
- decoding compressed pictures, videos and audio, where being faster
  means using less battery: very important in the age of the
  laptop/tablet/phone.
- scientific computing will often need to do some heavy-weight
  number-crunching, and being able to do that four (or eight, or
  sixteen) times faster can be very nice.

## What does "creating SIMD support" mean?

AKA, what am I doing with my days?

First, an introduction to what "programming" means. A programmer
generally spends their time either thinking, or editing text
documents: source code. The source code is written by the programmer
to describe all the things that the computer needs to do. A program (a
compiler) will then convert that source code into the sequence of
instructions the computer needs to execute (machine code).

(A compiler is itself a computer program and so has its own source
code, which was converted to machine code by a different compiler
which also has its own source code, which was converted to machine
code by another one... all the way back to the first programs, written
directly in machine code by humans: no compiler to help.)

There are a lot of different programming languages in the world: each
one has its own compilers that understand source code written in that
language, and each of those languages has its own specialties. Some
languages are simple and relatively easy to learn at the expense of
being slower or less flexible, while others are more complicated but
offer more control, flexibility and/or speed. The Rust programming
language is relatively new one being created by Mozilla, and fits into
the latter category.

Currently, the compiler for Rust doesn't have good support for
generating the SIMD instructions, so part of my work is making
modifications to the Rust compiler's own source code so that it does
this better. However, the interface this exposes is very low-level: it
has complete control, but requires a lot of effort to use. So part of
my project is also building a collection of Rust code (a library) that
wraps up the raw functionality into something nicer and easier to use.

Over the past few days I've made some big steps. I posted
[my first design document](https://internals.rust-lang.org/t/pre-rfc-simd-groundwork/2343)
for initial public feedback, and then
[a revised form as an official proposal](https://github.com/rust-lang/rfcs/pull/1199),
but I also made some progress with the actual code.

{% include image.html src="mandelbrot.png" alt="a screenshot of an ASCII art rendering of the Mandelbrot set" %}

It's a (rather basic) rendering of the
[Mandelbrot set](https://en.wikipedia.org/wiki/Mandelbrot_set), using
a sketch of my nicer library.

Somewhat unusually for SIMD, I can run it on many different types of
computers without having to change the code at all: that screenshot is
when running on my computer, but I can run it on my phone, a little
box similar to a Raspberry Pi, and in a variety of emulators... and
they all give exactly the same output. (It runs approximately 3&times;
faster than the non-SIMD version.)

It's a simple example, but it's a nice first step.

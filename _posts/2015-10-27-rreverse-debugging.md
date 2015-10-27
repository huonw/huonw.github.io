---
title: Rreverrse Debugging
layout: default
description: >
    rr is the debugger for Rust (et al.) that is is almost too good to
    be true.

comments:
    r_rust: "https://www.reddit.com/r/rust/comments/3qf6j9/rreverrse_debugging/"
    r_programming: "http://huonw.github.io/blog/2015/10/rreverse-debugging/"
    users: "https://users.rust-lang.org/t/rreverrse-debugging/3418"
---

Imagine being able to step forward and *backwards* as code runs in
your debugger. Imagine being able to do an test run multiple times
with exactly the same sequence of instructions and values, right down
to memory addresses and IO. Imagine being able to run an executable
thousands of times and then do all that in the one execution that
triggers the rare bug that's draining you of life...

The [rr tool][rr] is amazing.

[rr]: http://rr-project.org/
[rust]: https://rust-lang.org/

## A Debugger Skeptic

I've never been a huge user of debuggers. Being able to diagnose my
code line-by-line, statement-by-statement sounded theoretically good
to me, but I've never really "clicked" with it in practice.

Of course, there's an element of a vicious cycle: I only use debuggers
(generally gdb for native code, and pdb for Python) occasionally and
so I'm not an expert, so things end up being annoying, slow and
require searching the internet a lot, and this discourages me from
using them. And, for anything non-trivial, circumstances often mean
that my attempts to use a debugger are an exercise in pulling teeth
and are slower than just staring at the code harder and/or adding more
logging.

There's also a large element of just never having a tool I liked using
(which is what this whole post is about): I don't do that much in
managed languages like Java or C#, and I've not Visual Studio in any
detail, all of which I've heard rumours about being top-notch.

The thing I struggle with most is the disconnect between when problems
are detected/manifest, and the fundamental cause. A typical "tricky"
bug might only occur occasionally: an assertion of
internal-consistency inside a library triggers inside a function in a
somewhat non-deterministic way, meaning it may take hundreds or even
thousands of calls before it triggers. And, even when it does, the
assertion is usually just detecting some flow-on consequence, and the
actual problem is usually some unknown distance before the
assertion. All this means I struggle to wrangle the debugger into the
right position to catch the bug, without having to walk through too
many perfectly fine executions. I'm sure a gdb-empress could handle
this with ease, but I don't have those skills, so just sticking some
`println!`s in my code and reading the log backwards from the error is
easier.

Recently I've been trying to get better at using debuggers, to break
my vicious cycle. I've been poking around in my Python code for my
Masters' with pdb, and I've of course been poking around in Rust code
with gdb. This has been an uphill struggle: I have to consciously
decide to actually open a debugger and then work out exactly where I
need to be. There was a boost when I worked out that
[the `rust-gdb` wrapper][rust-gdb] was made to be used (and is
conveniently installed by default, even with
[`multirust`][multirust]), but, still: not my favourite activity.

And then, [rr 4.0][rr-4] was [released][rr-release]...

[rr-4]: https://github.com/mozilla/rr/releases/tag/4.0.0
[rr-release]: http://robert.ocallahan.org/2015/10/rr-40-released-with-reverse-execution.html
[rust-gdb]: https://github.com/rust-lang/rust/blob/0152a93bb41ba360b41dd62451c2472fc5978d0c/src/etc/rust-gdb
[multirust]: https://github.com/brson/multirust

## On a rrrroll

rr is everything I never knew I wanted from a debugger. I can barely
stay out of it: I'm slicing and dicing bugs in Rust code like never
before. Instead of having to plan out the best places to put
breakpoints for what I suspect the issue *might* be, I just run the
code, and then break whereever/whenever I want to later.

The workflow is simple: make a recording of an execution, and then
replay it in a debugger, with the ability to do go anywhere you want
any time.

With Rust/Cargo, my command line will often look like:

{% highlight sh linenos=table %}
$ cargo build --example foo
... things compiling ...
$ rr ./target/debug/examples/foo
... rr & program output ...
$ rr replay -d rust-gdb
... rr & gdb start-up ...
(gdb) break rust_panic
...
(gdb) continue
... program output ...
(gdb)
{% endhighlight %}

(The `-d` flag was [added][1551] just after 4.0 was released. I asked
a question about swapping in different gdbs, and was prompted to
file an issue, which was fixed in just a few hours! Anyway, this means
getting the best Rust experience requires building from rr
[from source][source] at the moment.)

[1551]: https://github.com/mozilla/rr/pull/1551
[source]: https://github.com/mozilla/rr

### Recording

The recording step with `rr` is simple: tell it your binary and it'll
run it, saving the state it needs for replaying as the program
executes.

This *could* be implemented as just saving the entire state of the
machine (memory and registers) between each step, but this would be
super-slow, and it won't be nearly as nice to use as rr. The worst
overhead I've noticed is the rr'd program taking 14× longer, but it's
a pretty dumb program, and I only came up with it for this blog post[^worst-case]:

[^worst-case]: I know pretty much nothing about the internals of rr or
    Linux, so I have no idea if this is actually triggering a
    particularly bad case; but I do know that rr will shim in/save the
    result of syscalls into the operating system, so doing a lot of
    them (as opening/reading/closing a file will do) is probably slow.

{% highlight rust linenos=table %}
// hammer.rs
use std::fs::File;
use std::io::prelude::*;

fn main() {
    for _ in 0..100000 {
        let mut buffer = [0; 1000];
        File::open("foo.txt").unwrap().read(&mut buffer).unwrap();
    }
}
{% endhighlight %}

It takes 4.2s to be recorded with rr, but only 0.3s to run
normally. (Compiled with `rustc -g hammer.rs`, with Rust 1.3.0.) Of
course, most programs will being doing more than reading from a file a
*lot*, and the overhead is much smaller for more typical
work-loads. For instance, I've been doing some work with Aatch's
big-integer library, [ramp][ramp], and
[the `factorial` example][factorial] (compiled in debug mode) takes
1.8s to run under rr, and 1.5s normally.

[ramp]: https://github.com/Aatch/ramp
[factorial]: https://github.com/Aatch/ramp/blob/7fac34b95600562a1272995568fff331eb533894/examples/factorial.rs

### Determinism

The replaying is where the magic really kicks in for me. The `rr
replay` command brings up an instance of gdb with the trace loaded
and ready to go.

The recording means that the "execution" of a replay is now
deterministic (and completely so, as far as I can tell), so you can be
sure about a lot of things. Reading random data is fine:

{% highlight rust linenos=table %}
// urandom.rs
use std::fs::File;
use std::io::prelude::*;

fn main() {
    let mut buffer = [0; 5];
    File::open("/dev/urandom").unwrap().read(&mut buffer).unwrap();

    println!("{:?}", buffer);
}
{% endhighlight %}

Recording and playing it back gives the same result each time:

{% highlight sh linenos=table %}
$ rr ./urandom
rr: Saving the execution of `./urandom' to trace directory `/home/huon/.rr/urandom-2'.
[45, 45, 28, 0, 236]
$ ~/projects/mozilla/rr/obj/bin/rr replay -d rust-gdb ~/.rr/urandom-2
GNU gdb (Ubuntu 7.10-1ubuntu2) 7.10
...
(gdb) c
Continuing.
[45, 45, 28, 0, 236]
{% endhighlight %}

Even the memory addresses of allocations, the stack and everything
else are deterministic, so watches and watchpoints can be placed on
exact bytes in memory and they'll do the right thing on every "run" of
the program. (I've not had a reason to use it yet, but seems awesome
for debugging memory corruption: find an execution that exhibits
corruption of some string or something, and place a watch point on
those bytes to find the locations that modify the string.)

### Back to the future

The thing I've really fallen in love with is reverse debugging:
instead of just being able to let the program's execution progress
forward in various forms (`step`, `next`, `continue` etc.), you can do
the same in reverse.

My strategy is:

- find out some code has a bug (oh no!),
- record executions with `rr` until the bug exhibits how I want[^rare],
- replay the execution until there's a sure-fire indicator it occurred
  (for instance, in Rust code, breaking on `rust_panic` will stop
  execution at any panic, including assertion failures),
- work backwards from that point, diving in and out of functions and
  stepping forward and backwards over lines/instructions/anything.

[^rare]: The rr developers point out this means tracking down rare
         bugs is made easier: run rr on a test-case in a loop until
         the bug triggers, and then you can dissect it at leisure,
         instead of just hoping to catch it by chance in a traditional
         debugger. (Again not something I've particularly needed to
         use yet, so I don't speak from experience: the rarest bug
         I've had to tackle recently occurred in about a quarter of
         executions.)

The keys here are the `r`/`reverse-`-prefixed gdb commands: `rn`
(`reverse-next`), `rs` (`reverse-step`), `rc` (`reverse-continue`) and
so on. These do what their non-`reverse` conterparts do, except
backwards: `next` goes from line 9 to line 10, `reverse-next` goes
from line 10 to line 9.

It just feels so great to start up the debugger, break on
`rust_panic`, examine the state of the world, and then break on some
*previous* function call and jump back to it with
`reverse-continue`. I can track down problems without having to fiddle
with setting up how to actually start the debugger in the right place.

### Removing the rose-coloured glasses

I'm probably sounding breathlessly enthusiastic, as if record/replay
and reverse execution was some amazing new functionally. It's not.

Other environments/languages/tools have the functionality, but it's
the first time I've had the luck to use it. There's even actually
[recording][gdb-rec] and [reverse execution][gdb-rev] in gdb itself,
but it is (apparently) quite slow, and seems to be less reliable: I
tried `target record` on an Rust executable, and the recording
immediately failed in glibc's `memset` (it couldn't handle an AVX2
instruction).

Also, rr of course has its own limitations:

- it doesn't literally fix your bugs for you,
- it only runs on Linux and only x86 & x86-64 (although there's a
  [bug about ARM][arm]),
- programs run on a single-core, so concurrency is possible but not
  parallelism (and hence programs may be much slower due to that, and
  some bugs for which rr might be nice to have are harder/impossible
  to trigger),
- modifying variables/memory is useless: any changes are ignored and
  overwritten, since the executions are recorded and fixed,
- it doesn't support all syscalls, but I've not encountered one that
  isn't supported personally, and the reason is they're implemented on
  an on-demand basis; things that have been founded to be needed for
  debugging Firefox etc.,
- the time overhead is fairly low, but the memory overhead is quite
  large: the factorial example from before went from 3MB (as measured
  by GNU time) to 82MB. I'm sure that a large part of this is a
  constant overhead, because it doesn't seem like it'd be a great tool
  for debugging large applications (for which it is designed, and
  [used][testimonials]) with 30× increase in memory use.

(There's a few more technical things mentioned in the limitations on
[rr's website][rr].)

[gdb-rec]: https://www.sourceware.org/gdb/wiki/ProcessRecord
[gdb-rev]: https://www.sourceware.org/gdb/wiki/ReverseDebug
[arm]: https://github.com/mozilla/rr/issues/1373
[testimonials]: https://github.com/mozilla/rr/wiki/Testimonials

## Summary

Reverse debugging has converted me from "meh debuggers" to "💜 rr":
being able to dance around freely&mdash;*frolic*, even&mdash;in code
pleases me like no other tool. It is language agnostic, I'm lead to
believe that anything that works in GDB itself will work with rr: I
believe it was designed with C/C++ applications like Firefox in mind,
but it works flawlessly with Rust, and I'm sure other languages too.

{% include comments.html c=page.comments %}

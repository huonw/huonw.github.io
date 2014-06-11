---
layout: default
title: "Error handling in Rust: a k-NN case study"
no_breadcrumbs: true
---

After posting
[a Rust translation of some *k*-nearest neighbour code][previouspost],
I got a [few](https://news.ycombinator.com/item?id=7875378)
[comments](https://news.ycombinator.com/item?id=7872878) asking "how
would you handle errors if you wanted to?". This is the perfect chance
to briefly demonstrate a few idioms.

See my [previous post][previouspost] for context and the original
code; like with the code in that post, this code compiles with `rustc
0.11.0-pre-nightly (e55f64f 2014-06-09 01:11:58 -0700)`

[previouspost]: {% post_url 2014-06-10-knn-rust %}

## What type of error handling to use?

The "canonical" way is to use type system, with types like
[`Result<A, B>`][result], which can either be an `Ok` containing a
value of type `A` or an `Err` containing a `B` (isomorphic to
Haskell's `Either`), and [`Option<T>`][option], which is either a
`Some` containing a `T`, or just `None` containing no data.

[result]: http://doc.rust-lang.org/master/std/result/type.Result.html
[option]: http://doc.rust-lang.org/master/std/option/type.Option.html

The standard library uses `Result` and `Option` pervasively, meaning
you can essentially be guaranteed to handle all errors (and
theoretically never crash) as long as you avoid calling
[`unwrap`][unwrap] and the small number of similar methods. For
example, [almost all IO actions][iohandling] return an
[`IoResult<...>`][ioresult], which defines the possible errors via the
[`IoError`][ioerror] type and its contained `IoErrorKind` enum.

[unwrap]: http://doc.rust-lang.org/master/core/result/type.Result.html#method.unwrap
[iohandling]: http://doc.rust-lang.org/master/std/io/index.html#error-handling
[ioresult]: http://doc.rust-lang.org/master/std/io/type.IoResult.html
[ioerror]: http://doc.rust-lang.org/master/std/io/struct.IoError.html

An approximation of monadic short-circuiting is provided for `Result`
by
[the `try!` macro](http://doc.rust-lang.org/master/std/result/#the-try!-macro),
which just returns immediately if an error occurs (that is, if
variable with type `Result` is an `Err`), propagating it upwards for
the caller to handle. However, `try!` isn't the only strategy, and
it's easy to define custom handlers, as I do below.

Before you ask: Rust lacks conventional exceptions (since these are
hard to make memory safe without a garbage collector, as I understand
it); in safe code/by default, unwinding can only be stopped at task
boundaries.

## The bullet-proof code

The `try!` macro and `IoError` form my inspiration for the code to
handle errors in `slurp_file`: define an enum with the various failure
conditions, and [define a short custom macro][macros] that either
"unwrap"s or short-circuits to return the appropriate error marker.

[macros]: http://doc.rust-lang.org/master/guide-macros.html

{% highlight rust linenos=table %}
#![feature(macro_rules)]

// the possible things that can go wrong
enum SlurpError {
    // The input was malformed (could have line/column number info too)
    InvalidInput,
    // Some piece of IO failed (e.g. couldn't open a file)
    FailedIo(IoError)
}

// short-circuiting macro: "unwrap" the value, an error will return
// from the surrounding function propagating that error upwards.
//
// macro_rules! macros take a sequence of tokens/AST non-terminals and
// attempt to pattern match on them, taking the first branch that
// fits, and then effectively replace the macro invocation with the
// right-hand side of that branch.
macro_rules! try_slurp {
    // `$...` is a special variable, a "macro argument", this `value`
    // is an expression, e.g. `1 + 2`, `foo()`, `if ... { ... } else {
    // ... }`. Hence, to match, this arm needs to be passed an
    // expression, a comma, then a literal `FailedIo`.
    // e.g. `try_slurp!(foo(), FailedIo)`
    ($value: expr, FailedIo) => {
        // The macro expands to this code if the pattern matches. The
        // `$value` expression is `match`d as a `Result<..., IoError>`
        // (passing in something else will be a type error, after the
        // macro expands). Success is unwrapped, and a failure is
        // returned from the function/closure in which the macro is
        // called.
        match $value {
            Ok(x) => x,
            Err(e) => return Err(FailedIo(e))
        }
    };

    // similarly here, this branch takes an arbitrary expression and
    // then has to match exactly `InvalidInput`
    ($value: expr, InvalidInput) => {
        // as above, except handling `$value` as an `Option<...>`.
        match $value {
            Some(x) => x,
            None => return Err(InvalidInput)
        }
    }
}

fn slurp_file(file: &Path) -> Result<Vec<LabelPixel>, SlurpError> {
    use std::{result, option};
    let mut file = BufferedReader::new(try_slurp!(File::open(file), FailedIo));

    let lines = file.lines()
        .skip(1)
        .map(|line| {
            let line = try_slurp!(line, FailedIo);

            let mut splits = line.as_slice().trim().split(',').map(|x| from_str(x));

            // .and_then is flattening Option<Option<int>> to Option<int>.
            let label = try_slurp!(splits.next().and_then(|x| x), InvalidInput);

            let pixels = try_slurp!(option::collect(splits), InvalidInput);

            Ok(LabelPixel {
                label: label,
                pixels: pixels
            })
        });

    result::collect(lines)
}
{% endhighlight %}

> vbhit provides [a nice alternative implementation][vhbit] that
> avoids defining the macro.

[vhbit]: http://www.reddit.com/r/rust/comments/27tuu5/error_handling_in_rust_a_knn_case_study/ci4nvpi.

The return value can then be pattern-matched where-ever `slurp_file`
is called, and the error propagated upwards there, or handled
appropriately e.g. the `slurp_file` calls in `main` could be changed
to something like:

{% highlight rust linenos=table %}
let training_set = match slurp_file(&Path::new("trainingsample.csv")) {
    Ok(data) => data,
    Err(e) => {
        match e {
            FailedIo(io) => println!("Couldn't read file: {}", io),
            InvalidInput => println!("Invalid file format")
        }
        std::os::set_exit_status(1);
        return
    }
};
{% endhighlight %}

## "collect"?

The two `collect` functions
([`result`](http://doc.rust-lang.org/master/std/result/fn.collect.html)
and
[`option`](http://doc.rust-lang.org/master/std/option/fn.collect.html))
are useful helpers, which take an `Iterator<Result<T, X>>` and return
something like `Result<Vec<T>, X>` or `Result<HashSet<T>, X>`
(respectively `Option`). It's not a coincidence that these functions
share the same name as the
[`Iterator.collect`](http://doc.rust-lang.org/master/std/iter/trait.Iterator.html#tymethod.collect)
I used last time: all of them allow collecting to the same set of
generic container types.

A Haskeller might notice that they are actually just special cases of
[the monadic `sequence`][sequence]; there is a possibility that this
could be handled generically in future (with higher kinded types),
but, unfortunately, there is no guarantee that a Monad trait will work
nicely due to Rust's affine types and various low-level details.


[sequence]: http://hackage.haskell.org/package/base-4.7.0.0/docs/Prelude.html#v:sequence

> _**Comments on
> [/r/rust](http://www.reddit.com/r/rust/comments/27tuu5/error_handling_in_rust_a_knn_case_study/),
> [/r/programming](http://www.reddit.com/r/programming/comments/27tuw8/error_handling_in_rust_a_knn_case_study/),
> [HN](https://news.ycombinator.com/item?id=7875793)**_

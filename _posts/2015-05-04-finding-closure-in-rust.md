---
layout: default
title: Finding closure in Rust
description: >
    Closures in Rust are powerful and flexible

draft: true

comments:
    users: ""
    r_rust: ""
---

Have you ever used an [iterator adapter][iteratorext] in [Rust][Rust]?
Called a method on [`Option`][option]? [Spawned][spawn] a thread?
You've almost certainly used a [closure]. The design in Rust may seem
a little complicated, so let's reinvent it from scratch.

[Rust]: http://rust-lang.org
[iteratorext]: http://doc.rust-lang.org/nightly/std/iter/trait.IteratorExt.html
[option]: http://doc.rust-lang.org/nightly/std/option/enum.Option.html
[spawn]: http://doc.rust-lang.org/nightly/std/thread/struct.Thread.html#method.spawn
[closure]: https://en.wikipedia.org/wiki/Closure_%28computer_programming%29

The apparent complexity was only recently introduced (in
[RFC 114][rfc]), moving Rust to a model for closures similar to
C++11's, giving us programmers much more power and flexibility. It
might not look like it from the surface, but the new design is simple
and focused, with the compiler usually doing the right thing to
achieve maximum flexibility. (It seems that "flexibility" is going to
be my catch-phrase in this post...)

[rfc]: https://github.com/rust-lang/rfcs/blob/master/text/0114-closures.md

> Steve Klabnik has written
> [some docs on Rust's closures][book-closures] for the official
> documentation. I've explicitly avoided reading it so far because
> I've always wanted to write this post, and I think it's better to
> give a totally independent explanation while I have the chance.

[book-closures]: http://doc.rust-lang.org/nightly/book/closures.html

## What's a closure?

In a sentence: a closure is a function that can directly use variables
from the scope in which it is defined. This is often described as the
closure *closing over* or *capturing* variables (the
*captures*). Collectively, the variables are called the *environment*.

Syntactically, a closure in Rust is an anonymous function[^anon] value
defined a little like Ruby, with pipes: `|arguments...| body`. For
example, `|a, b| a + b` defines a closure that takes two arguments and
returns their sum. It's just like a normal function declaration, with
more inference:

{% highlight rust linenos=table %}
// function:
fn foo(a: i32, b: i32) -> i32 { a + b }
// closure:
      |a,      b|               a + b
{% endhighlight %}

Just like a normal function, they can be called with parens:
`closure(arguments...)`.

[^anon]: The Rust `|...| ...` syntax is more than just a closure: it's
         an [anonymous function][anon]. In general, it's possible to have things
         that are closures but aren't anonymous (e.g. in Python,
         functions declared with `def foo():` are closures too, they
         can refer to variables in any scopes in which the `def foo`
         is contained). The anonymity refers to the fact that the
         closure expression is a value, it's possible to just use it
         directly and there's no separate `fn foo() { ... }` with the
         function value referred to via `foo`.

[anon]: http://en.wikipedia.org/wiki/Anonymous_function


To illustrate the capturing, this code snippet calls
[`map`][Option::map] on an `Option<i32>`, which will call a closure on
the `i32` (if it exists) and create a new `Option` containing the
return value of the call.

[Option::map]: http://doc.rust-lang.org/nightly/std/option/enum.Option.html#method.map

{% highlight rust linenos=table %}
fn main() {
    let option = Some(2);

    let x = 3;
    // explicit types:
    let new: Option<i32> = option.map(|val: i32| -> i32 { val + x });
    println!("{:?}", new); // Some(5)

    let y = 10;
    // inferred:
    let new2 = option.map(|val| val * y);
    println!("{:?}", new2); // Some(20)
}
{% endhighlight %}

The closures are capturing the `x` and `y` variables, allowing them to
be used while mapping. (To be more convincing, imagine they were only
known at runtime, so that one couldn't just write `val + 3` inside the
closure.)

## Back to basics

Now that we have the semantics in mind, take a step back and riddle me
this: how would one implement that sort of generic `map` if Rust
didn't have closures?

The functionality of `Option::map` we're trying to duplicate is (equivalently):

{% highlight rust linenos=table %}
fn map<X, Y>(option: Option<X>, transformer: ...) -> Option<Y> {
    match option {
        Some(x) => Some(transformer(x)), // (closure syntax for now)
        None => None,
    }
}
{% endhighlight %}

We need to fill in the `...` with something that transforms an `X` into
a `Y`. The biggest constraint for perfectly replacing `Option::map` is
that it needs to be generic in some way, so that it works with
absolutely any way we wish to do the transformation. In Rust, that
calls for a generic bounded by a trait.

{% highlight rust linenos=table %}
fn map<X, Y, T>(option: Option<X>, transform: T) -> Option<Y>
    where T: /* the trait */
{
{% endhighlight %}


This trait needs to have a method that converts some specific type
into another. Hence there'll have to be form of type parameters to
allow the exact types to be specified in generic bounds like
`map`. There's two choices: generics in the trait definition ("input
type parameters") and associated types ("output type parameters"). The
quoted names hint at the choices we should take: the type that gets
input into the transformation should be a generic in the trait, and
the type that is output by the transformation should be an associated
type.[^assoc-vs-not]

[^assoc-vs-not]: This choice is saying that transformers can be
                 overloaded by the starting type, but the ending type
                 is entirely determined by the pair of the transform
                 and the starting type. Using an associated type for
                 the return value is more restrictive (no overloading
                 on return type only) but it gives the compiler a much
                 easier time when inferring types. Using an associated
                 type for the input value too would be too
                 restrictive: it is very useful for the output type to
                 depend on the input type, e.g. a transformation `&'a
                 [i32]` to `&'a i32` (by e.g. indexing) has the two
                 types connected via the generic lifetime `'a`.

So, our trait looks something like:

{% highlight rust linenos=table %}
trait Transform<Input> {
    type Output;

    fn transform(/* self?? */, input: Input) -> Self::Output;
}
{% endhighlight %}

The last question is what sort of `self` (if any) the method should
take?

The transformation should be able to incorporate arbitrary information
beyond what is contained in `Input`. Without any `self` argument, the
method would look like `fn transform(input: Input) -> Self::Output`
and the operation could only depend on `Input` and global
variables (ick). So we do need one.

The most obvious options are by-reference `&self`,
by-mutable-reference `&mut self`, or by-value `self`. We want to allow
the users of `map` to have as much power as possible while still
enabling `map` to type-check. At a high-level `self` gives
*implementers* (i.e. the types users define) the most flexibility,
with `&mut self` next and `&self` the least flexible. Conversely,
`&self` gives *consumers* of the trait (i.e. functions with generics
bounded by the trait) the most flexibility and `self` the least.

Starting at the start of that list: we can try `self`. This gives `fn
transform(self, input: Input) -> Self::Output`. The by-value `self`
will consume ownership, and hence `transform` can only be called
once. Fortunately, `map` only needs to do the transformation once, so
by-value `self` works perfectly.

In summary, our `map` and its trait look like:

{% highlight rust linenos=table %}
trait Transform<Input> {
    type Output;

    fn transform(self, input: Input) -> Self::Output;
}

fn map<X, Y, T>(option: Option<X>, transform: T) -> Option<Y>
    where T: Transform<X, Output = T>
{
    match option {
        Some(x) => Some(transform.transform(x)),
        None => None,
    }
}
{% endhighlight %}


The example from before can then be reimplemented rather verbosely, by
creating structs and implementing `Transform` to do the appropriate
conversion for that struct.

{% highlight rust linenos=table %}
// replacement for |val| val + x
struct Adder { x: i32 }

impl Transform<i32> for Adder {
    type Output = i32;

    // ignoring the `fn ... self`, this looks similar to |val| val + x
    fn transform(self, val: i32) -> i32 {
        val + self.x
    }
}

// replacement for |val| val * y
struct Multiplier { y: i32 }

impl Transform<i32> for Multiplier {
    type Output = i32;

    // looks similar to |val| val * y
    fn transform(self, val: i32) -> i32 {
        val * self.y
    }
}

fn main() {
    let option = Some(2);

    let x = 3;
    let new: Option<i32> = map(option, Adder { x: x });
    println!("{:?}", new); // Some(5)

    let y = 10;
    let new2 = map(option, Multiplier { y: y });
    println!("{:?}", new2); // Some(20)
}
{% endhighlight %}

We've manually implemented something that seems to have the same
semantics as Rust closures, using traits and some structs to store and
manipulate the captures. In fact, the struct has some uncanny
similarities to the "environment" of a closure: it stores a pile of
variables that need to be used in the body of `transform`.

## How do real closures work?

Just like that (plus a little more flexibility and syntactic
sugar). The real definition of `Option::map` is:

{% highlight rust linenos=table %}
impl<X> Option<X> {
    pub fn map<Y, F: FnOnce(X) -> Y>(self, f: F) -> Option<Y> {
        match self {
            Some(x) => Some(f(x)),
            None => None
        }
    }
}
{% endhighlight %}

`FnOnce(T) -> U` is another name for our `Transform<X, Output = Y>`
bound, and, `f(x)` for `transform.transform(x)`.

There are three traits for closures, all of which provide the
`...(...)` call syntax (one could regard them as different kinds of
`operator()` in C++). They differ only by the `self` type of the call
method, and they cover all of the `self` options listed above.

- `&self` is [`Fn`](http://doc.rust-lang.org/nightly/std/ops/trait.Fn.html)
- `&mut self` is [`FnMut`](http://doc.rust-lang.org/nightly/std/ops/trait.FnMut.html)
- `self` is [`FnOnce`](http://doc.rust-lang.org/nightly/std/ops/trait.FnMut.html)

When you write `|args...| code...` the compiler will implicitly define
a unique new struct type storing the captured variables, and then
implement one of those traits using the closure's body, rewriting any
mentions of captured variables to go via the closure's
environment. When the program hits the closure definition at runtime,
it fills in an instance of struct and passes that instance into
whatever it needs to (like we did with our `map` above).

There's two questions left:

1. how are variables captured? (what type are the fields of the environment struct?)
2. which trait is used? (what type of `self` is used?)

The compiler answers both by using some local rules to choose the
version that will give the most flexibility. The local rules are
designed to be able to be checked only knowing the definition
the closure, and the types of any variables it captures.[^i-think]

[^i-think]: This statement isn't precisely true in practice,
            e.g. `rustc` will emit different errors if closures are
            misused in certain equivalent-but-non-identical
            ways. However, I believe these are just improved
            diagnostics, not a fundamental language thing... however,
            I'm not sure.

By "flexibility" I mean the compiler chooses the option that (it
thinks) will compile, but imposes the least on the programmer.

### Captures and `move`

If you're familiar with closures in C++11, you may recall the `[=]`
and `[&]` capture lists: capture variables by-value and by-reference
respectively.

Rust has similar capability: variables can be captured by-value---the
variable is moved into the closure environment---or by-reference---a
reference to the variable is stored in the closure environment.

By default, the compiler looks at the closure body to see how captured
variables are used, and infers how it captures based on that:

- if a captured variable is only ever used through a shared reference,
  it is captured by `&` reference,
- if it used through a mutable reference also, it is captured by `&mut` reference,
- if it is used by value (i.e. moved around), it is forced to be captured by-value.

In summary, the compiler will capture variables based on the most
severe restriction. This analysis happens on a per-variable basis, e.g.:

{% highlight rust linenos=table %}
fn by_value(_: T) {}
fn by_mut(_: &mut T) {}
fn by_ref(_: &T) {}

let x: T = ...;
let mut y: T = ...;
let mut z: T = ...;

let closure = || {
    by_ref(&x);
    by_ref(&y);
    by_ref(&z);

    // forces `y` and `z` to be at least captured by `&mut` reference
    by_mut(&mut y);
    by_mut(&mut z);

    // forces `z` to be captured by value
    by_value(z);
};
{% endhighlight %}

The environment struct generated for `closure` would look like:

{% highlight rust linenos=table %}
struct Environment<'x, 'y> {
    x: &'x T,
    y: &'y mut T,
    z: T
}
{% endhighlight %}

The `move` keyword can be placed in front of a closure declaration,
and overrides the inference to capture all variables by value: `let
closure = move || { /* same code */ }` would have environment `x: T,
y: T, z: T`. This is useful when needs to return a closure, as
capturing by reference will chain the closure to the stack frame in
which it is created via the lifetimes of those references. It is also
strictly more flexible than capturing by reference.

Interestingly, unlike C++, there's little distinction between capture
by reference and by value, and the analysis Rust does is not actually
necessary: it is designed to make programmers' lives easier. The
reference types are first-class in Rust, so "capture by reference" is
the same as "capture a reference by value". This code will have the
same captures as the first one, by using `move` to capture references
by value.

{% highlight rust linenos=table %}
let x: T = ...;
let mut y: T = ...;
let mut z: T = ...;

let x_ref: &T = &x;
let y_mut: &mut T = &mut y;

let closure = move || {
    by_ref(x_ref);
    by_ref(&*y_mut);
    by_ref(&z);

    by_mut(y_mut);
    by_mut(&mut z);

    by_value(z);
};
{% endhighlight %}

Rust has no equivalent to the capture lists of C++ mentioned at the
start of this section: captures are always determined by what is used
in the closure body. Why? Like all other places in Rust that move
variables around by value, capture by value is a move of the variable
that is captured. Similarly, implicitly capturing by reference has the
same restrictions as the explicit `&` or `&mut` reference types
do. All in all, those two facts means that it is pretty difficult to
accidentally get an horribly incorrect program by capturing in a
closure without meaning it, as the full power of Rust's type system is
protecting you. (Of course, there's nothing stopping you getting a
non-horribly incorrect program, but at least it'll "just" be a
semantic bug, not a memory safety bug.)

### Traits

Which of the three `Fn*` traits to implement is also determined
automatically by the compiler based on how the captures are used.

The rule can be deduced by thinking about closures in their
`struct`-`impl` desugared form, e.g. if a closure needs to capture
something by `&mut`, then the closure can't be a `Fn`. Consider `let
mut v = vec![]; let closure = || v.push(1);`.

{% highlight rust linenos=table %}
struct Environment<'v> {
    v: &'v mut Vec<i32>
}

// (Fn doesn't actually work like this in manual impls, but this code is already
// invalid, by design)
impl<'v> Fn() for Environment<'v> {
    fn call(&self) {
        self.v.push(1) // error: cannot borrow data mutably
    }
}
{% endhighlight %}

It is illegal to mutate via a `& &mut ...`, and `&self` is creating
that outer shared reference. If it was `&mut self` or `self`, it would
be fine: the former is more flexible, so the compiler implements `FnMut`
for `closure`.

Similarly, if `closure` was to be `|| drop(v);`, that is, move out of
`v`, we'd have to have `FnOnce` with its by-value `self`, as one
couldn't move out of `v` from behind `&self` or `&mut self`
references.

Thinking along these lines, one can see that the three closure traits
are actually three nested sets: every closure that implements `Fn` can
also implement `FnMut` (if `&self` works, `&mut self` also works;
proof: `&*self`), and similarly every closure implementing `FnMut` can
also implement `FnOnce`.

This hierarchy is actually enforced at the type level,
e.g. [`FnMut`](http://doc.rust-lang.org/nightly/std/ops/trait.FnMut.html)
has declaration:

{% highlight rust linenos=table %}
pub trait FnMut<Args>: FnOnce<Args> {
    ...
}
{% endhighlight %}

In words: anything that implements `FnMut` *must* also implement
`FnOnce`.

## Zero cost abstractions

One of Rust's goals is to be efficient, with abstractions compiling
away and just leaving fast machine code. The design of closures is key
to this, by using generics and having each closure have its own type,
the compiler has full information about what closure calls are doing,
and so has the choice to perform key optimisations like inlining.

For example, the following snippets compile to the same code

{% highlight rust linenos=table %}
x.map(|z| z + 3)

match x {
    Some(z) => Some(z + 3),
    None => None
}
{% endhighlight %}

(When I tested it by placing them into separate functions in a single
binary, the compiler actually optimised the second function to direct
call to the first.)

This power allows one to build high-level, "fluent" APIs without
losing performance compared to writing out the details by hand. The
prime example of this is
[iterators](http://doc.rust-lang.org/std/iter): one can write long
chains of calls to adapters like `map` and `filter` which get
optimised down to efficient C-like code. (For example, I wrote
[a post][knn] that demonstrates this, and the situation has only
improved since then: the closure design described here was implemented
months later.)

By leveraging traits and unique types, Rust's closures do not require
allocations, complicated run time management or even virtual function
calls. One can of course opt-in to such things via trait objects, such
as `Box<Fn()>`, but they're not required.

[knn]: {% post_url 2014-06-10-comparing-knn-in-rust %}

## In closing

Rust's C++11-inspired closures are powerful tools that allow for
high-level and efficient code to be build, marrying two properties
often in contention.

Unfortunately, this closure design comes with a trade-off of surface
complexity, but it really is only surface, as the internals are
directly using Rust's type system with traits, types implementing
them, and generics.

{% include comments.html c=page.comments %}

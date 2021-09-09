---
layout: default
title: "Announcing Primal: Putting Raw Power Into Prime Numbers"
description: >
    I recently released primal 0.2: a crate for high-performance
    computation of properties related to prime numbers.

comments:
    r_rust: "http://www.reddit.com/r/rust/comments/39134l/announcing_primal_putting_raw_power_into_prime/"
    users: "https://users.rust-lang.org/t/primal-putting-raw-power-into-prime-numbers/1747"
---

Over the past few weeks I've been working on improving my
`slow_primes` library, culminating in needing rename and the 0.2
release of `primal`, a Rust crate for computing properties of prime
numbers with [state-of-the-art algorithms][primesieve], while still
maintaining an idiomatic and easy-to-use interface.

<div class="centered-libs">
{% include rust-lib.html name="primal" inline=true %}
</div>


[primesieve]: http://primesieve.org/

My computer takes a quarter of a second and less than 3MB of RAM to
tell me that there 50,847,534 primes below 1 billion:

{% highlight rust linenos %}
extern crate primal;

fn main() {
    println!("there are {} primes below 1 billion",
             primal::StreamingSieve::prime_pi(1_000_000_000));
}
{% endhighlight %}


Some of the first programming I did was [Project Euler][pe]: a site
that has little mathematical problems designed to be solved with the
assistance of a computer. Beyond just the challenge of solving the
problem, there's the challenge of writing code to go as fast as
possible: Project Euler will always hold a little place in my heart
for making me learn a *lot* about writing fast code. That's where I
first tried to write fast prime sieves: I recall being pretty happy
when I could sieve up to a "big" number like 1 million quickly; now
I'm pretty happy that I can sieve up to 1 billion in (probably) less
time, and certainly less memory.

[pe]: http://projecteuler.net

## Migrating from `slow_primes`/`primal` 0.1

- rename `slow_primes` to `primal` or bump the version in your
  `Cargo.toml`,
- replace `Primes` with [`Sieve`][sieve]: `Primes::sieve(100)`
  &rarr; `Sieve::new(100)`,
- call [`primes_from`][primes_from] instead of `primes()`:
  `sieve.primes()` &rarr; `sieve.primes_from(0)`,
- revel in the improved sieving performance.

[sieve]: http://huonw.github.io/primal/primal/struct.Sieve.html
[primes_from]: http://huonw.github.io/primal/primal/struct.Sieve.html#method.primes_from

## Highlights

`primal` is pretty great, if I do say so myself:

- the documentation is complete: every function has some text
  describing it, all have explicit examples (except `Sieve::new`), and
  there's [a nice introductory walk-through][intro] tackling three
  classes of problems.
- it includes a highly optimised segmented, wheel [sieve]: `Sieve`. It
  is essentially a Rust port of Kim Walisch's awesome [primesieve],
  which is apparently the fastest sieve in the world. The version in
  `primal` is really fast, certainly the fastest sieve I can find in
  Rust, but there's still room to improve: the Rust version is
  currently around 5-20% slower than primesieve (single-threaded), and
  lacks some of the fancier features that it adds on top.
- there's some reasonably deep mathematics:
  [`estimate_nth_prime(n)`][enp] and [`estimate_prime_pi(k)`][epp]
  provide fast (*O*(1)) but precise bounds for the *n*th prime, and
  the number of primes below *k*:

  - `estimate_prime_pi(1_000_000_000)` returns a lower-bound of
    50,785,736 (0.12% below the true value) and an upper-bound of
    50,865,514 (0.04% above),
  - `estimate_nth_prime(50_847_535)` returns 999,873,297 and
    1,000,273,162, which are 0.01% below and 0.03% above
    (respectively) the true value of 1,000,000,007.

However, my favourite feature is [`Primes`][primes]: which is an fast
lazy iterator over *all* primes, with no upper-bound (other than integer
size). In a flash of inspiration, I realised it would be possible to
do this reasonably efficiently with a simple wrapper around the core
sieve. It can be used a bit like:

{% highlight rust linenos %}
extern crate primal;

fn main() {
    println!("the 50,847,535th prime is {}",
             primal::Primes::all().nth(50_847_535 - 1).unwrap());
}
{% endhighlight %}

<div class="join"></div>

It's not the most efficient way to get the nth prime, but it still
only takes <s>0.9</s> 0.52 seconds[^update] to print 1,000,000,007. (A better way is
[`StreamingSieve::nth_prime`][streaming], which takes ~0.22s for the
same task.)

[^update]: I realised the original implementation was inefficient, and
           using far more memory than necessary: fixing that made a
           huge difference.

[intro]: http://huonw.github.io/primal/primal/#examples
[enp]: http://huonw.github.io/primal/primal/fn.estimate_nth_prime.html
[epp]: http://huonw.github.io/primal/primal/fn.estimate_prime_pi.html
[primes]: http://huonw.github.io/primal/primal/struct.Primes.html
[streaming]: http://huonw.github.io/primal/primal/struct.StreamingSieve.html#method.nth_prime

{% include comments.html c=page.comments %}

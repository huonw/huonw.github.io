---
layout: default
css: ["/css/archive.css"]
title:
no_top_link: true
no_toc: true
google_meta: true
---

<ul class="post-list">
{% for post in site.posts limit: 4 %}
    <li class="post-post">
      <a href="{{ post.url }}" class="post-title">{{ post.title }}</a>
      <span class="post-date">{{ post.date | date_to_string }}</span>
        <p class="post-excerpt">{{ post.excerpt | remove: '<p>' | remove: '</p>' }}
            </p>
            <a href="{{ post.url }}" class="post-more">Read more</a>
        </li>
{% endfor %}
</ul>

[Archive](archive.html)

## About me

I'm Huon Wilson, a mathematics student who writes code a lot and text
occasionally. I do a lot of volunteering on
[the Rust programming language](http://rust-lang.org/), and am on
Rust's core team.

### Code

You can find me on [GitHub](https://github.com/huonw) and
[StackOverflow](http://stackoverflow.com/users/1256624/dbaupp). I
wrote [2048-4D](http://huonw.github.io/2048-4D/), and a lot of Rust
code:

- major items in the main distribution include `std::rand` and
  `#[deriving]`.
- compiler lint plugins for
  [spell-checking documentation](https://github.com/huonw/spellck) and
  [detecting copy-paste errors](https://github.com/huonw/copypasteck)
- a variety of macro plugins (including use<s>less</s>ful ones that handle
  [FRACTRAN](https://github.com/huonw/fractran_macros) and
  [brainfuck](https://github.com/huonw/brainfuck_macros))

[All the gory details](https://github.com/huonw?tab=repositories).

### Get in touch

The best way to contact me is email: `d``b``a``u``.``p``p` at
[Google's mail service](http://gmail.com).

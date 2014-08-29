---
layout: default
title: Archive
css: ["/css/archive.css"]
---

Text I've written.

<ul class="post-list">
{% for post in site.posts %}
    <li class="post-post">
      <a href="{{ post.url }}" class="post-title">{{ post.title }}</a>
      <span class="post-date">{{ post.date | date_to_string }}</span>
        <p class="post-excerpt">{{ post.excerpt | remove: '<p>' | remove: '</p>' }}</p>
        <a href="{{ post.url }}" class="post-more">Read more</a>
        </li>
{% endfor %}
</ul>

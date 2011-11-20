---
layout: default
title: Hyphenation
---

## Introduction
This page is designed to be a test of the JavaScript hyphenation and line breaking algorithms.

## Hyphenation
The hyphenation is done by [Hyphenator.js](http://code.google.com/p/hyphenator/), which uses the algorithm developed by Liangs for use in TeX. It is currently using the British English dictionary (i.e. en-gb). This seems to work quite well.

## Line breaking
The line breaking algorithm is the Knuth & Plass algorithm, which was also developed for use in TeX (it's pretty good at public domain typesetting algorithms, this "TeX" program).

The implementation is strongly based on [Typeset](http://www.bramstein.com/projects/typeset/) by Bram Stein. Most of the implementation was taken from [his publication](http://www.bramstein.com/projects/typeset/flatland/) of [Flatland](http://en.wikipedia.org/wiki/Flatland), but it had to be modified to get it to be more general (to work with Markdown-generated pages, for instance). 

There are still some problems with its current form: the words "Hyphenator.js", "Typeset", "his publication" and "Flatland" are actually links, but the line breaking algorithm destroys all markup at the moment (I'm working on it!).

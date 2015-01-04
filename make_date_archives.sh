#!/bin/bash
for year in 2015; do
    echo $year
    mkdir -p blog/$year
    cat > blog/$year/index.md <<EOF
---
layout: default
title: $year
css: ["/css/archive.css"]
no_toc: true
---

{% include archive.html year=$year %}
EOF
    for month in {01..12}; do
        mkdir -p blog/$year/$month
        echo " $month"
        cat > blog/$year/$month/index.md <<EOF
---
layout: default
title: $year–$month
css: ["/css/archive.css"]
no_toc: true
---

{% include archive.html year=$year month=$month %}
EOF
    done
done

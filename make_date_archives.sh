#!/bin/bash
for year in 2014 2015 2016; do
    echo $year
    mkdir -p $year
    cat > $year/index.md <<EOF
---
layout: default
title: $year
css: ["/css/archive.css"]
---

{% include archive.html year=$year %}
EOF
    for month in {01..12}; do
        mkdir -p $year/$month
        echo " $month"
        cat > $year/$month/index.md <<EOF
---
layout: default
title: $year–$month
css: ["/css/archive.css"]
---

{% include archive.html year=$year month=$month %}
EOF
    done
done

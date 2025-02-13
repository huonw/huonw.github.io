#!/bin/bash
for year in 2014 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025; do
    echo $year
    mkdir -p blog/$year
    cat > blog/$year/index.md <<EOF
---
layout: default
title: $year
---

{% include archive.html year=$year %}
EOF
    for month in $(seq -f "%02g" 1 12); do
        mkdir -p blog/$year/$month
        echo " $month"
        cat > blog/$year/$month/index.md <<EOF
---
layout: default
title: ${year}–$month
---

{% include archive.html year=$year month=$month %}
EOF
    done
done

# /// script
# dependencies = ["pint"]
# [tool.uv]
# exclude-newer = "2025-02-23T00:00:00Z"
# ///

import pint

ureg = pint.UnitRegistry()

print("## Equivalence")

kWh_per_100km = ureg("kWh / (100 km)")
Wh_per_km = 1 * ureg("Wh / km")

print(f"1 kWh/100km = {kWh_per_100km.to("N")}")
print(f"1 Wh/km = {Wh_per_km.to("N")}")


print("## Resistances")

Crr = 0.0077  # Michelin Pilot Sport EV are EU fuel efficiency class B => https://energy-efficient-products.ec.europa.eu/product-list/tyres/tyres-technology-introduction_en#rolling-resistance-table
weight = 2100 * ureg("kg")
gravity = 9.8 * ureg("m/s^2")
normal_force = weight * gravity
force_rolling_resistance = Crr * normal_force
print(f"Rolling resistance = {force_rolling_resistance.to("N")}")

Cd = 0.288  # https://www.hyundai.com/content/dam/hyundai/wallan/en/data/marketing/brochure/product/ioniq5/NE_-52p_main_06212021_REV5.pdf (p8)
air_density = 1.225 * ureg("kg / m^3")
velocity = 110 * ureg("km / h")

# https://en.wikipedia.org/wiki/Hyundai_Ioniq_5
width = 1890 * ureg("mm")
height = 1605 * ureg("mm")
frontal_area = width * height  # assume the car is a rectangle, good enough!

print(f"Area = {frontal_area.to("m^2")}")

force_drag = 0.5 * air_density * velocity**2 * Cd * frontal_area
print(f"Drag = {force_drag.to("N")}")

print(f"Total = {(force_drag + force_rolling_resistance).to("N")}")

average_efficiency = 19 * kWh_per_100km
print(f"Observed efficiency = {average_efficiency.to("N")}")

print("## Speeding")

velocity_coeff = 0.5 * air_density * Cd * frontal_area

print(f"Force (N) = {force_rolling_resistance.to("N").magnitude} + {velocity_coeff.to("N / (km/h)^2").magnitude} * v^2")

print(f"Efficiency (Wh/km) = {force_rolling_resistance.to("Wh/km").magnitude} + {velocity_coeff.to("Wh/km / (km/h)^2").magnitude} * v^2")

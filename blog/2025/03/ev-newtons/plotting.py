# /// script
# dependencies = ["pint", "matplotlib"]
# [tool.uv]
# exclude-newer = "2025-02-23T00:00:00Z"
# ///
import matplotlib.pyplot as plt
import numpy as np
import io
import sys
import pathlib

sys.path.insert(0, ".")
from units import force_rolling_resistance, velocity_coeff, ureg

root = pathlib.Path(__file__).parent.parent.parent.parent.parent

ureg.setup_matplotlib(True)

def efficiency(v):
    return (force_rolling_resistance + velocity_coeff * v**2).to("N")

x = np.arange(0, 161) * ureg("km/h")
y = efficiency(x)
print(x)
print(y)

plt.rcParams['svg.fonttype'] = 'none'
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.size"] = 18
plt.rcParams["font.sans-serif"]  = ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji"]

fig, ax_n = plt.subplots(figsize=(8, 4))

ax_wh_km = ax_n.twinx()

for v, c in [(30, "green"), (60, "blue"), (110, "purple"), (140, "red")]:
    e_n = int(round(efficiency(v * ureg("km/h")).magnitude))
    e_wh_km = int(round(efficiency(v * ureg("km/h")).to("Wh/km").magnitude))

    ax_n.annotate(f"{e_n} N\n{e_wh_km} Wh/km\n@ {v} km/h",
                  (v, e_n),
                  (-1, 1.2),
                  ha="center",
                  va="bottom",
                  fontsize="x-small",
                  xycoords="data",
                  textcoords="offset fontsize",
                  color=c,
                  arrowprops=dict(arrowstyle="-"))
ax_n.plot(x, y)

ax_n.spines[["top"]].set_visible(False)
ax_wh_km.spines[["top"]].set_visible(False)


ax_n.set_xlim(0, 160)
# ax_n.tick_params(axis="x", labelrotation=45)

ax_n.set_ylim(0, 1250)
ax_wh_km.set_ylim(0, (1250 * ureg.N).to("Wh/km").magnitude)

# ax_wh_km.set_yticks((200 * np.arange(6 + 1) * ureg.N).to("Wh/km").magnitude)
ax_wh_km.yaxis.set_major_formatter("{x:.0f}")

ax_n.set_ylabel("N")
ax_n.set_xlabel("Velocity (km/h)")
ax_wh_km.set_ylabel("Wh/km")


fig.tight_layout()

buf = io.StringIO()
fig.savefig(buf, format="svg")
# get rid of the <?xml ...> and <!doctype ...> lines
no_intro_lines = "\n".join(buf.getvalue().splitlines()[3:])

dir = root / "_includes/blog/ev-newtons"
dir.mkdir(parents=True, exist_ok=True)
(dir / "plot.svg").write_text(no_intro_lines)

plt.show()

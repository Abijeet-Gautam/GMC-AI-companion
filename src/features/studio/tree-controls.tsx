"use client";
import { defaultTreeSettings, type TreeSettings } from "@/lib/tree-settings";
type SliderKey =
  | "age"
  | "size"
  | "mainLimbs"
  | "levels"
  | "branches"
  | "spread"
  | "crookedness"
  | "trunkThickness"
  | "baseFlare"
  | "trunkHeight"
  | "splitHeight"
  | "whorls"
  | "droop"
  | "hang"
  | "clumpSize"
  | "leafSize"
  | "density"
  | "season"
  | "wind"
  | "windSpeed"
  | "windDirection"
  | "flutter"
  | "rotation"
  | "sunAngle"
  | "sunHeight"
  | "sunIntensity"
  | "skyIntensity"
  | "leavesForMaturity";
type Slider = [SliderKey, string, number, number, number];
const shape: Slider[] = [
  ["size", "Tree size", 2, 8, 0.1],
  ["mainLimbs", "Main limbs", 2, 6, 1],
  ["levels", "Branching levels", 1, 3, 1],
  ["branches", "Branches per fork", 2, 4, 1],
  ["spread", "Branch spread", 0.25, 1.5, 0.01],
  ["crookedness", "Crookedness", 0, 1, 0.01],
  ["trunkThickness", "Trunk thickness", 0.08, 0.6, 0.01],
  ["baseFlare", "Root flare", 0, 3, 0.05],
  ["trunkHeight", "Bare trunk height", 0, 2, 0.05],
  ["splitHeight", "Split height", 0.15, 0.7, 0.01],
  ["whorls", "Pine whorls", 3, 12, 1],
  ["droop", "Branch droop", -1, 1, 0.05],
  ["hang", "Willow hang", 0.2, 1.2, 0.01],
];
export function TreeControls({
  settings,
  onChange,
  disabled = false,
}: {
  settings: TreeSettings;
  onChange: (settings: TreeSettings) => void;
  disabled?: boolean;
}) {
  function change<K extends keyof TreeSettings>(
    key: K,
    value: TreeSettings[K],
  ) {
    onChange({ ...settings, [key]: value });
  }
  function sliders(fields: Slider[]) {
    return fields.map(([key, label, min, max, step]) => (
      <label key={key} className="studio-slider">
        <span>
          {label}
          <output>
            {step === 1 ? settings[key] : settings[key].toFixed(2)}
          </output>
        </span>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={settings[key]}
          onChange={(event) => change(key, Number(event.target.value))}
        />
      </label>
    ));
  }
  return (
    <fieldset className="studio-fields" disabled={disabled}>
      <details open>
        <summary>Tree & growth</summary>
        <label className="studio-field">
          Growth driver
          <select
            aria-label="Growth driver"
            value={settings.growthMode}
            onChange={(event) =>
              change(
                "growthMode",
                event.target.value as TreeSettings["growthMode"],
              )
            }
          >
            <option value="contributions">
              Grow with visitor contributions
            </option>
            <option value="manual">Manual age preview</option>
          </select>
        </label>
        <p className="studio-note">
          {settings.growthMode === "contributions"
            ? "Starts bare. Every approved hope adds a leaf and unfolds the branches. Preview counts are never saved to the public tree."
            : "Manual age and season control the model. Use contribution growth for the reception experience."}
        </p>
        {sliders(
          settings.growthMode === "contributions"
            ? [["leavesForMaturity", "Leaves to maturity", 8, 500, 1]]
            : [["age", "Tree age", 0.05, 1, 0.01]],
        )}
        <label className="studio-field">
          Tree seed
          <input
            aria-label="Studio tree seed"
            type="number"
            min={1}
            max={999999}
            value={settings.seed}
            onChange={(event) =>
              change(
                "seed",
                Math.max(1, Math.min(999999, Number(event.target.value) || 1)),
              )
            }
          />
        </label>
        <button
          className="studio-text-button"
          type="button"
          onClick={() =>
            onChange({
              ...defaultTreeSettings,
              acceptingContributions: settings.acceptingContributions,
              headline: settings.headline,
            })
          }
        >
          Reset appearance
        </button>
      </details>
      <details>
        <summary>Branch shape</summary>
        {sliders(
          shape.filter(([key]) => {
            if (key === "whorls") return settings.species === "pine";
            if (key === "hang") return settings.species === "willow";
            if (key === "droop")
              return ["pine", "cypress"].includes(settings.species);
            if (
              ["mainLimbs", "levels", "branches", "splitHeight"].includes(key)
            )
              return ["oak", "spooky"].includes(settings.species);
            return (
              settings.species !== "bush" || ["size", "spread"].includes(key)
            );
          }),
        )}
        {settings.species === "bush" && (
          <p className="studio-note">
            The upstream bush is a low leafy dome without woody branches.
          </p>
        )}
      </details>
      <details>
        <summary>Leaves & season</summary>
        <label className="studio-field">
          Leaf shape
          <select
            aria-label="Leaf shape"
            value={settings.leafShape}
            onChange={(event) =>
              change(
                "leafShape",
                event.target.value as TreeSettings["leafShape"],
              )
            }
          >
            <option value="pointed">Pointed</option>
            <option value="round">Round</option>
            <option value="oak">Oak</option>
            <option value="needle">Needles</option>
          </select>
        </label>
        {sliders([
          ["leafSize", "Leaf size", 0.4, 2, 0.05],
          ["clumpSize", "Clump size", 0.5, 2, 0.05],
          ["density", "Leaf density", 0.5, 1.6, 0.05],
          ["season", "Season", 0, 1, 0.01],
        ])}
        <p className="studio-note">
          In contribution mode each rendered leaf represents an approved hope.
          Density affects the manual canopy; season never erases a visitor's
          leaf.
        </p>
      </details>
      <details>
        <summary>Colours</summary>
        <label className="studio-toggle">
          <input
            type="checkbox"
            checked={settings.customColors}
            onChange={(event) => change("customColors", event.target.checked)}
          />
          Custom tree colours
        </label>
        {(
          [
            ["leafShadow", "Leaf shadow"],
            ["leafMid", "Leaf midtone"],
            ["leafLight", "Leaf highlight"],
            ["woodColor", "Bark"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="studio-color">
            {label}
            <input
              aria-label={label}
              type="color"
              value={settings[key]}
              onChange={(event) =>
                onChange({
                  ...settings,
                  customColors: true,
                  [key]: event.target.value,
                })
              }
            />
          </label>
        ))}
      </details>
      <details>
        <summary>Wind & motion</summary>
        {sliders([
          ["wind", "Wind strength", 0, 1, 0.01],
          ["windSpeed", "Wind speed", 0.1, 2, 0.05],
          ["windDirection", "Wind direction", -180, 180, 5],
          ["flutter", "Leaf flutter", 0, 1, 0.01],
          ["rotation", "Tree orientation", 0, 360, 5],
        ])}
        <label className="studio-toggle">
          <input
            type="checkbox"
            checked={settings.autoRotate}
            onChange={(event) => change("autoRotate", event.target.checked)}
          />
          Slow camera orbit
        </label>
      </details>
      <details>
        <summary>Light & ground</summary>
        {sliders([
          ["sunAngle", "Sun angle", -180, 180, 5],
          ["sunHeight", "Sun elevation", 0.15, 1.4, 0.05],
          ["sunIntensity", "Sun intensity", 0.5, 3, 0.05],
          ["skyIntensity", "Sky intensity", 0.3, 2, 0.05],
        ])}
        <label className="studio-toggle">
          <input
            type="checkbox"
            checked={settings.grass}
            onChange={(event) => change("grass", event.target.checked)}
          />
          Grass at the roots
        </label>
      </details>
      <details>
        <summary>Display & performance</summary>
        <label className="studio-field">
          Quality
          <select
            aria-label="Studio rendering quality"
            value={settings.quality}
            onChange={(event) =>
              change("quality", event.target.value as TreeSettings["quality"])
            }
          >
            <option value="auto">Automatic</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="studio-field">
          Renderer
          <select
            aria-label="Studio renderer"
            value={settings.renderer}
            onChange={(event) =>
              change("renderer", event.target.value as TreeSettings["renderer"])
            }
          >
            <option value="auto">3D with fallback</option>
            <option value="illustration">Illustration</option>
          </select>
        </label>
        <label className="studio-field">
          Reception headline
          <input
            aria-label="Reception headline"
            maxLength={90}
            value={settings.headline}
            onChange={(event) => change("headline", event.target.value)}
          />
        </label>
        <label className="studio-toggle">
          <input
            type="checkbox"
            checked={settings.acceptingContributions}
            onChange={(event) =>
              change("acceptingContributions", event.target.checked)
            }
          />
          Accept new visitor hopes
        </label>
      </details>
    </fieldset>
  );
}

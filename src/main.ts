// todo
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
const app = document.querySelector<HTMLDivElement>("#app")!;
// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// location of Oakes classroom on leaflet
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Create the map (element with id "map" is defined in index.html)
interface Cell {
  i: number;
  j: number;
}
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
const map = leaflet.map(document.getElementById("map")!, {
  center: playerMarker.getLatLng(),
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const geoCoinPlayer: GeoCoin[] = [];

// Text for geon coin amount
const geonCoinText = document.createElement("h1");

app.append(geonCoinText);

// Adds marker to Location

// interface

playerMarker.addTo(map);
const knownCells = new Map<string, Cell>();
function getConicalCell(cell: Cell): boolean {
  const cellKey = " " + cell.i + " , " + cell.j;
  //ask map questions about if it has the cell already filled
  //
  if (!knownCells.has(cellKey)) {
    console.log("brand new");
    knownCells.set(cellKey, cell);
    return false;
  } else {
    console.log("got it already");
    return true;
  }
}

// Latitude/Longitude pairing
interface Latlng {
  lat: number;
  lng: number;
}

// Top left and bottom right.  Helps with drawing
interface GeoRect {
  topL: Latlng;
  bottomR: Latlng;
}

interface GeoCoin {
  Serial: number;
  i: number;
  j: number;
}

// for just the coin count
function updateInventory() {
  let coinListing = "coins: ";

  for (const { i, j, Serial } of geoCoinPlayer) {
    coinListing += `(${i}, ${j}, #${Serial})`;
  }
  geonCoinText.innerHTML = coinListing;
}

//turns coins to a list within strings
function coinListToString(geoCoinPart: GeoCoin[]): string {
  let geoString = "";
  for (const { i, j, Serial } of geoCoinPart) {
    geoString += `(${i}, ${j}, #${Serial}), \n`;
  }
  return geoString;
}

// Rectangle
function getRectForCell(cell: Cell): GeoRect {
  // return used to get longitude and latitude of set point
  return {
    topL: {
      // moving right now from Null Island
      // TILE used to shrink the size of the rectangle.
      lat: cell.i * TILE_DEGREES,
      lng: cell.j * TILE_DEGREES,
    },
    bottomR: {
      lat: (cell.i + 1) * TILE_DEGREES, // adding 1 so the shape gets width and height, otherwise is a dot.
      lng: (cell.j + 1) * TILE_DEGREES,
    },
  };
}

function getCellForPoint(point: Latlng): Cell {
  return {
    i: point.lat / TILE_DEGREES,
    j: point.lng / TILE_DEGREES,
  };
}

function displayCacheForCell(cell: Cell) {
  const bounds = getRectForCell(cell); // bounds equal to whatever it returned
  const coinAmount = Math.round(100 * luck([cell.i, cell.j].toString())) + 1; // coin Amount deterministic choosing

  const check = getConicalCell(cell);
  if (check) {
    return;
  }
  const cacheCoins: GeoCoin[] = [];
  for (let x = 0; x < coinAmount; x++) {
    cacheCoins.push({
      Serial: x,
      i: cell.i,
      j: cell.j,
    });
  }

  // bounds calculates for you
  const rect = leaflet.rectangle([
    [bounds.topL.lat, bounds.topL.lng],
    [bounds.bottomR.lat, bounds.bottomR.lng],
  ]);
  rect.bindPopup(() => {
    const popUpBox = document.createElement("div");
    let cacheString = coinListToString(cacheCoins);
    const popUpText =
      `<div>A cache here at "${cell.i},${cell.j}".  There are <span id="value"> ${cacheString} coins here </div>
                <button id="get">get</button><button id="give">give</button>`;
    popUpBox.innerHTML = popUpText;

    // will make a button that takes from the cell
    popUpBox
      .querySelector<HTMLButtonElement>("#get")!
      .addEventListener("click", () => {
        if (cacheCoins.length != 0) {
          geoCoinPlayer.push(cacheCoins.pop()!);
          cacheString = coinListToString(cacheCoins);
          popUpBox.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheString; // we can take value from this since we put the <span id = "value"> in front of this.
          updateInventory();
        }
      });

    // will make the button that gives to the cell
    popUpBox
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        if (geoCoinPlayer.length != 0) {
          cacheCoins.push(geoCoinPlayer.pop()!);
          cacheString = coinListToString(cacheCoins);
          popUpBox.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheString;
          updateInventory();
        }
      });

    return popUpBox;
  });
  rect.addTo(map);
}

function determineSpawn(cell: Cell, chance: number) {
  const luckCheck = luck([cell.i, cell.j].toString());
  if (luckCheck <= chance) {
    displayCacheForCell(cell);
  }
}

function cacheSpawnNearCell(center: Cell, min: number, max: number) {
  for (let x = min; x <= max; x++) {
    for (let y = min; y <= max; y++) {
      determineSpawn(
        {
          i: y + center.i,
          j: x + center.j,
        },
        CACHE_SPAWN_PROBABILITY,
      );
    }
  }
}

cacheSpawnNearCell(
  getCellForPoint(playerMarker.getLatLng()),
  -NEIGHBORHOOD_SIZE,
  NEIGHBORHOOD_SIZE,
);

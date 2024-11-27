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

// history of player moves
const pastMoves: leaflet.LatLng[] = [OAKES_CLASSROOM]; // takes the past moves from latitude and longitude and pushes to array

const gameEventBus: EventTarget = new EventTarget();

const STATE_CHANGED = "State changed";
gameEventBus.addEventListener(STATE_CHANGED, (_e) => {
  saveGameState();
  loadGameState();
  updateInventory();
  cacheSpawnNearCell(
    getCellForPoint(playerMarker.getLatLng()),
    -NEIGHBORHOOD_SIZE,
    NEIGHBORHOOD_SIZE,
  );
});

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

interface SavedGame {
  playerCurrentSpot: leaflet.LatLng;
  playerCoins: GeoCoin[];
  mementos: Array<[Cell, string]>;
  movementData: leaflet.LatLng[];
}

function saveGameState() {
  const playerCurrentSpot = playerMarker.getLatLng();
  for (const [cell, coins] of cacheInventories) {
    mementos.set(cell, JSON.stringify(coins)); // saving them before they leave
  }
  const saveState: SavedGame = {
    // storing player's and cache's attributes
    playerCurrentSpot,
    playerCoins: geoCoinPlayer, // Store player's current coins
    mementos: Array.from(mementos.entries()),
    movementData: pastMoves,
  };
  localStorage.setItem("saveState", JSON.stringify(saveState)); // sending to local storage as a string
}

function loadGameState() {
  const reloadState = localStorage.getItem("saveState");

  if (reloadState) {
    // parsing recovered data
    const recoverState = JSON.parse(reloadState) as SavedGame;

    // resetting the poisiton back to saved
    const { lat, lng } = recoverState.playerCurrentSpot;
    playerMarker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);

    if (Array.isArray(recoverState.mementos)) {
      mementos.clear();
      recoverState.mementos.forEach(([key, value]) => {
        mementos.set(getConicalCell(key), value);
      });
    }

    // setting to display to what was stored.
    geoCoinPlayer.length = 0;
    geoCoinPlayer.push(...recoverState.playerCoins);
    pastMoves.length = 0;
    pastMoves.push(...recoverState.movementData);

    if (pastMoves.length == 1) {
      // used for when resetting to make sure if player spot is only location data
      map.removeLayer(movementLine);
    } else {
      map.addLayer(movementLine); // adding it back to the screen when gone
      movementLine.setLatLngs(pastMoves); // sets the movement line to saved one
    }
  }
}

const rectangles: leaflet.Layer[] = [];
// coin list for the player
const geoCoinPlayer: GeoCoin[] = [];

// Text for geon coin amount
const geonCoinText = document.createElement("h1");

app.append(geonCoinText);

// Adds marker to Location
playerMarker.addTo(map);
const knownCells = new Map<string, Cell>();
function getConicalCell(cell: Cell): Cell {
  const cellKey = " " + cell.i + " , " + cell.j;
  // ask map questions about if it has the cell already filled
  if (!knownCells.has(cellKey)) {
    knownCells.set(cellKey, cell);
    return cell;
  } else {
    return knownCells.get(cellKey)!;
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
geonCoinText.innerHTML = "coins: ";
// for just the coin count
function updateInventory() {
  let coinListing = "coins: ";

  for (const { i, j, Serial } of geoCoinPlayer) {
    coinListing += `(${i}, ${j}, #${Serial})`;
  }
  geonCoinText.innerHTML = coinListing;
}

// turns coins to a list within strings
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
    i: Math.round(point.lat / TILE_DEGREES),
    j: Math.round(point.lng / TILE_DEGREES),
  };
}

const cacheInventories: Map<Cell, GeoCoin[]> = new Map();

function displayCacheForCell(cell: Cell) {
  const bounds = getRectForCell(cell); // bounds equal to whatever it returned
  const coinAmount = Math.round(100 * luck([cell.i, cell.j].toString())) + 1; // coin Amount deterministic choosing

  cell = getConicalCell(cell);
  const cacheCoins: GeoCoin[] = [];
  cacheInventories.set(cell, cacheCoins);
  for (let x = 0; x < coinAmount; x++) {
    cacheCoins.push({
      Serial: x, // increases by one to make serial count unique.
      i: cell.i,
      j: cell.j,
    });
  }
  if (mementos.has(cell)) {
    const recoveredCoins = JSON.parse(mementos.get(cell)!);
    cacheCoins.length = 0;
    cacheCoins.push(...recoveredCoins); // takes all from array and uses them as arguments to push
  }
  // bounds calculates for you
  const rect = leaflet.rectangle([
    [bounds.topL.lat, bounds.topL.lng],
    [bounds.bottomR.lat, bounds.bottomR.lng],
  ]);
  rectangles.push(rect);
  rect.bindPopup(() => {
    const popUpBox = document.createElement("div");
    let cacheString = coinListToString(cacheCoins); //turns the list into a string singular value.
    const popUpText =
      `<div>A cache here at "${cell.i},${cell.j}".  There are <span id="value"> ${cacheString} coins here </div>
                <button id="get">get</button><button id="give">give</button>`; //cacheString makes it easier to change later
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
        }
        gameEventBus.dispatchEvent(new Event(STATE_CHANGED));
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
        }
        gameEventBus.dispatchEvent(new Event(STATE_CHANGED));
      });

    return popUpBox;
  });
  rect.addTo(map);
}

// Defining all of the buttons for each of the direction
const directionEffects: Record<string, [number, number]> = {
  north: [TILE_DEGREES, 0],
  south: [-TILE_DEGREES, 0],
  west: [0, -TILE_DEGREES],
  east: [0, TILE_DEGREES],
};

// taking position of north, south, west, east, and making them into buttons.
for (const dir in directionEffects) {
  const button = document.getElementById(dir);
  const [Di, Dj] = directionEffects[dir];
  button?.addEventListener("click", () => {
    updatePlayerPosition(Di, Dj);

    gameEventBus.dispatchEvent(new Event(STATE_CHANGED));
  });
}

// Reset Coin History
document.getElementById("reset")?.addEventListener("click", () => {
  const confirm = prompt(
    'Are you sure you want to reset all your coins?  Type "yes" if so. ',
  );
  if (confirm?.toUpperCase() == "YES") {
    mementos.clear();
    cacheInventories.clear();
    geoCoinPlayer.length = 0;
    pastMoves.length = 0;
    pastMoves.push(playerMarker.getLatLng());
    gameEventBus.dispatchEvent(new Event(STATE_CHANGED));
    geonCoinText.innerHTML = "coins: ";
  }
});

// Sensor button for global location.
document.getElementById("sensor")?.addEventListener("click", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        playerMarker.setLatLng([latitude, longitude]);
        gameEventBus.dispatchEvent(new Event(STATE_CHANGED));

        map.panTo(playerMarker.getLatLng());
        const updatedPosition = {
          lat: latitude,
          lng: longitude,
        };
        drawLine(updatedPosition);
      },
      (error) => {
        console.error(`Error (${error.code}): ${error.message}`);
      },
    );
  }
});

function updatePlayerPosition(i: number, j: number) {
  const latLngTemp = playerMarker.getLatLng();
  const latTemp = latLngTemp.lat + i;
  const lngTemp = latLngTemp.lng + j;

  playerMarker.setLatLng([latTemp, lngTemp]);
  const updatedPosition = {
    lat: latTemp,
    lng: lngTemp,
  };
  map.panTo(playerMarker.getLatLng()); // moves center
  drawLine(updatedPosition);
}

function drawLine(latlng: Latlng) {
  pastMoves.push(leaflet.latLng(latlng));
}

function determineSpawn(cell: Cell, chance: number) {
  const luckCheck = luck([cell.i, cell.j].toString());
  if (luckCheck <= chance) {
    displayCacheForCell(cell);
  }
}
const mementos: Map<Cell, string> = new Map();
// clears out items
function clearMap() {
  for (const rect of rectangles) {
    rect.remove();
  }
}

function cacheSpawnNearCell(center: Cell, min: number, max: number) {
  clearMap();
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

// Note: take a few seconds for line to show up when sensor button is clicked
const movementLine = leaflet // uses array to make a red line of movment history
  .polyline(pastMoves, {
    color: "red",
    weight: 3,
  })
  .addTo(map);
loadGameState();
gameEventBus.dispatchEvent(new Event(STATE_CHANGED));

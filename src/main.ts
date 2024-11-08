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
let coinCount = 0;

// location of Oakes classroom on leaflet
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
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

// Text for geon coin amount
const geonCoinText = document.createElement("h1");
geonCoinText.innerHTML = "coin amount: " + coinCount;
app.append(geonCoinText);

// Adds marker to Location
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.addTo(map);

// interface
interface Cell {
  i: number;
  j: number;
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

// for just the coin count
function updateCounter() {
  geonCoinText.innerHTML = "coin amount: " + coinCount;
}

// Rectangle
function getRect(cell: Cell): GeoRect {
  // return used to get longitude and latitude of set point
  return {
    topL: {
      // moving right now from OAKES_CLASSROOM
      // TILE used to shrink the size of the rectangle.
      lat: OAKES_CLASSROOM.lat + cell.i * TILE_DEGREES,
      lng: OAKES_CLASSROOM.lng + cell.j * TILE_DEGREES,
    },
    bottomR: {
      lat: OAKES_CLASSROOM.lat + (cell.i + 1) * TILE_DEGREES, // adding 1 so the shape gets width and height, otherwise is a dot.
      lng: OAKES_CLASSROOM.lng + (cell.j + 1) * TILE_DEGREES,
    },
  };
}

function createCell(cell: Cell) {
  const bounds = getRect(cell); // bounds equal to whatever it returned
  let coinAmount = Math.round(100 * luck([cell.i, cell.j].toString())) + 1; // coin Amount deterministic choosing

  // bounds calculates for you
  const rect = leaflet.rectangle([
    [bounds.topL.lat, bounds.topL.lng],
    [bounds.bottomR.lat, bounds.bottomR.lng],
  ]);
  rect.bindPopup(() => {
    const popUpBox = document.createElement("div");

    popUpBox.innerHTML = `
                <div>A cache here at "${cell.i},${cell.j}". There are <span id="value">${coinAmount} </span></div>coins here
                <button id="get">get</button><button id="give">give</button>`;

    // will make a button that takes from the cell
    popUpBox
      .querySelector<HTMLButtonElement>("#get")!
      .addEventListener("click", () => {
        if (coinAmount != 0) {
          coinAmount--;
          popUpBox.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinAmount.toString(); // we can take value from this since we put the <span id = "value"> in front of this.
          coinCount++;
          updateCounter();
        }
      });

    // will make the button that gives to the cell
    popUpBox
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        if (coinCount != 0) {
          coinAmount++;
          popUpBox.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinAmount.toString();
          coinCount--;
          updateCounter();
        }
      });

    return popUpBox;
  });
  rect.addTo(map);
}

// uses luck function and chance amount to determine whether to spawn or not
function determineSpawn(cell: Cell, chance: number) {
  const luckCheck = luck([cell.i, cell.j].toString());
  if (luckCheck <= chance) {
    createCell(cell);
  }
}

// location is put in determine spawn and adds it.
function locationCheck(min: number, max: number) {
  for (let x = min; x <= max; x++) {
    // for loop used for getting everything from min to max
    for (let y = min; y <= max; y++) {
      determineSpawn(
        {
          i: y,
          j: x,
        },
        CACHE_SPAWN_PROBABILITY,
      );
    }
  }
}

locationCheck(-NEIGHBORHOOD_SIZE, NEIGHBORHOOD_SIZE);

//Notes for me:
//10% of certain grids.
//Creating a cell certain amount away from a cell.

//Caculate based on

//Calcate cell amount be based on the size of the cell length and width
//Each cell has x, y coordinate

//One function gets rect width and height (get rect for cell), returns

//interface with Cell

//CreateCell places rect

// Add a rectangle to the map to represent the cache

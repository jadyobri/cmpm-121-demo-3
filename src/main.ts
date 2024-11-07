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
// import luck from "./luck.ts";

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
// const TILE_DEGREES = 1e-4;
// const NEIGHBORHOOD_SIZE = 8;
// const CACHE_SPAWN_PROBABILITY = 0.1;
let coinCount = 0;

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

const geonCoinText = document.createElement("h1");
geonCoinText.innerHTML = "coin amount: " + coinCount;
app.append(geonCoinText);

//Adds marker to Location
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.addTo(map);

//interface
interface Cell {
  i: number;
  j: number;
}

//Latitude/Longitude pairing
interface Latlng {
  lat: number;
  lng: number;
}

//Top left and bottom right.  Helps with drawing
interface GeoRect {
  topL: Latlng;
  bottomR: Latlng;
}

//Rectangle
function getRect(cell: Cell): GeoRect {
  const TILE_DEGREES = 1e-4;
  //return used to get longitude and latitude of set point
  return {
    topL: {
      //moving right now from OAKES_CLASSROOM
      //TILE used to shrink the size of the rectangle.
      lat: OAKES_CLASSROOM.lat + cell.i * TILE_DEGREES,
      lng: OAKES_CLASSROOM.lng + cell.j * TILE_DEGREES,
    },
    bottomR: {
      lat: OAKES_CLASSROOM.lat + (cell.i + 1) * TILE_DEGREES, //adding 1 so the shape gets width and height, otherwise is a dot.
      lng: OAKES_CLASSROOM.lng + (cell.j + 1) * TILE_DEGREES,
    },
  };
}

function createCell(cell: Cell) {
  const bounds = getRect(cell); //bounds equal to whatever it returned

  //leaflet makes the rectangle on the screen

  //bounds calculates for you
  const rect = leaflet.rectangle([
    [bounds.topL.lat, bounds.topL.lng],
    [bounds.bottomR.lat, bounds.bottomR.lng],
  ]);
  rect.addEventListener("click", () => {
    //coin cap later on
    coinCount++;
    geonCoinText.innerHTML = "coin amount: " + coinCount;
  });
  rect.addTo(map);
}
createCell({
  i: 0,
  j: 0,
});

//Each cell has x, y coordinate

//One function gets rect width and height (get rect for cell), returns

//interface with Cell

//CreateCell places rect

// Add a rectangle to the map to represent the cache

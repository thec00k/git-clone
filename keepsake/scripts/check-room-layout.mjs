/** Tiny assertions for chamber helpers — run with `node scripts/check-room-layout.mjs`. */
import assert from "node:assert/strict";

function faceForHotspot(id) {
  if (id === "shelf") return "right";
  if (id === "map") return "left";
  return "front";
}

function yawDegrees(face) {
  if (face === "left") return -90;
  if (face === "right") return 90;
  return 0;
}

function nextFace(face, dir) {
  if (dir === "left") {
    if (face === "right") return "front";
    return "left";
  }
  if (face === "left") return "front";
  return "right";
}

function roomLayoutFromSearch(search) {
  return new URLSearchParams(search).get("room") === "flat" ? "flat" : "chamber";
}

assert.equal(faceForHotspot("shelf"), "right");
assert.equal(faceForHotspot("map"), "left");
assert.equal(faceForHotspot("book"), "front");
assert.equal(faceForHotspot(null), "front");
assert.equal(yawDegrees("front"), 0);
assert.equal(yawDegrees("left"), -90);
assert.equal(yawDegrees("right"), 90);
assert.equal(nextFace("front", "left"), "left");
assert.equal(nextFace("front", "right"), "right");
assert.equal(nextFace("left", "right"), "front");
assert.equal(nextFace("right", "left"), "front");
assert.equal(nextFace("left", "left"), "left");
assert.equal(nextFace("right", "right"), "right");
assert.equal(roomLayoutFromSearch(""), "chamber");
assert.equal(roomLayoutFromSearch("?tour=1"), "chamber");
assert.equal(roomLayoutFromSearch("?room=flat"), "flat");
assert.equal(roomLayoutFromSearch("?room=flat&tour=1"), "flat");

console.log("room layout helpers: ok");

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
  const room = new URLSearchParams(search).get("room");
  if (room === "flat") return "flat";
  if (room === "chamber") return "chamber";
  return "glb";
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
assert.equal(roomLayoutFromSearch(""), "glb");
assert.equal(roomLayoutFromSearch("?tour=1"), "glb");
assert.equal(roomLayoutFromSearch("?room=chamber"), "chamber");
assert.equal(roomLayoutFromSearch("?room=flat"), "flat");
assert.equal(roomLayoutFromSearch("?room=flat&tour=1"), "flat");

function clockFromMode(timeMode, now) {
  if (timeMode === "day") return { h: 10, m: 7, live: false };
  if (timeMode === "dusk") return { h: 18, m: 41, live: false };
  if (timeMode === "night") return { h: 22, m: 8, live: false };
  return { h: now.getHours(), m: now.getMinutes(), live: true };
}

assert.deepEqual(clockFromMode("day", new Date()), { h: 10, m: 7, live: false });
assert.deepEqual(clockFromMode("dusk", new Date()), { h: 18, m: 41, live: false });
assert.deepEqual(clockFromMode("night", new Date()), { h: 22, m: 8, live: false });
assert.equal(clockFromMode("auto", new Date(2026, 8, 6, 14, 22)).live, true);
assert.equal(clockFromMode("auto", new Date(2026, 8, 6, 14, 22)).h, 14);

console.log("room layout helpers: ok");

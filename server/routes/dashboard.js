// server/routes/dashboard.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dashboardController");
const { isLoggedIn } = require("../middleware/checkAuth");

// Auth guard on every route
router.use(isLoggedIn);

// Notes CRUD
router.get("/",                      ctrl.dashboard);
router.post("/add",                  ctrl.dashboardAddNoteSubmit);
router.put("/item/:id",              ctrl.dashboardUpdateNote);
router.delete("/item-delete/:id",    ctrl.dashboardDeleteNote);
router.post("/search",               ctrl.dashboardSearchSubmit);

// Trash
router.get("/trash",                 ctrl.getTrashNotes);
router.delete("/item-permanent/:id", ctrl.permanentDelete);
router.put("/item-restore/:id",      ctrl.restoreNote);

// Lock
router.put("/lock/:id",              ctrl.toggleLock);

// FEATURE 1: Archive
router.get("/archived",              ctrl.getArchivedNotes);
router.put("/archive/:id",           ctrl.archiveNote);
router.put("/unarchive/:id",         ctrl.unarchiveNote);

module.exports = router;

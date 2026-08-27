const express = require("express");
const multer = require("multer");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rh = require("../controllers/rapportsHebdoController");

// En mémoire (pas sur disque) : le fichier est ensuite envoyé tel quel vers
// Supabase Storage ou server/uploads par rapportsHebdoController/storage.js.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(rh.list));
router.get("/:id", asyncHandler(rh.getOne));
router.get("/:id/pdf", asyncHandler(rh.pdf));
router.post("/", asyncHandler(rh.create));
router.put("/:id", asyncHandler(rh.update));
router.delete("/:id", asyncHandler(rh.remove));

router.get("/:id/attachments", asyncHandler(rh.listAttachments));
router.post("/:id/attachments", upload.single("file"), asyncHandler(rh.uploadAttachment));
router.get("/:id/attachments/:attachmentId", asyncHandler(rh.downloadAttachment));
router.delete("/:id/attachments/:attachmentId", asyncHandler(rh.removeAttachment));

module.exports = router;
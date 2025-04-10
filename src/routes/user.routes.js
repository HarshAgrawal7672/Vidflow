import { Router } from "express";
import { loginuser, logoutuser, refreshaccessToken, registeruser,changeCurrentPassword,getCurrentUser,updateUserProfile,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router()

router.route("/register").post(
    upload.fields([
        {name:"avatar",
            maxCount:1
        },
        {name:"coverImage",
            maxCount:1
        }
    ]),
    registeruser
)

router.route("/login").post(loginuser)

//secured routes
router.route("/logout").post(
    verifyJWT,
    logoutuser)

router.route("/refresh-token").post(
    refreshaccessToken
)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateUserProfile)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)
export default router

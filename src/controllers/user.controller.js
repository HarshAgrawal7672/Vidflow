import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadonCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    }
    catch(err){
        throw new ApiError(500,"something went wrong while generating access token and refresh token")
    }
}

const registeruser= asyncHandler(async (req,res)=>{
    //get user detail from front end
    // validation
    // check if user already exist:username or email
    // check for images , check for avatar
    // upload them to clodinary, avatar
    // create user in db
    // remove password and refresh token field from response
    //check for user creation
    //return res


    const{fullName,email,username,password}=req.body
    console.log(email)

    if([fullName,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    const existingUser=await User.findOne({
        $or:[{username}, {email}]})
   
        if(existingUser){
        throw new ApiError(409,"Username or email already exists")
    }
    

    const avatarLocalPath=await req.files['avatar']?.[0]?.path;
    // const coverImageLocalPath=await req.files['coverImage']?.[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required no local")
    }
console.log(avatarLocalPath)
    const avatar=await uploadonCloudinary(avatarLocalPath);
    const coverImage=await uploadonCloudinary(coverImageLocalPath)
    
    if(!avatar) {
        throw new ApiError(400,"Avatar is required ??")

    }


   const user=await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
   }) 

   const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
       throw new ApiError(500,"Failed to create user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
   )
})


const loginuser= asyncHandler(async (req,res)=>{
    //get user detail from front end
    // validation of username or email
    // check if user exist
    // check password
    // generate access and refresh token
    // return token to user in form of cookies

    const{email,password,username}=req.body

    if(!(email || username)){
        throw new ApiError(400,"Username or email is required")
    }
    const user = await User.findOne({
        $or:[{email},{username}]
    })

    if(!user){
        throw new ApiError(401,"user doesn't exist")
    }

    const ispasswordvalid=await user.isPasswordCorrect(password)

    if(!ispasswordvalid){
        throw new ApiError(401,"password does not match")
    }

    const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)


    const loggedInuser= await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly: true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInuser,
            accessToken,
            refreshToken
        },"user logged in successfully")
    )

})
 
const logoutuser=asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },
        {
            new:true
        }
    )

    const options={
        httpOnly: true,
        secure:true
    }

    return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
        new ApiResponse(200,{},"user logged out successfully")
    )
})

const refreshaccessToken =asyncHandler(async (req, res) => {
    const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingrefreshToken){
        throw new ApiError(401, "unauthorized access ")
    }

    try{
        const decodedToken = jwt.verify(incomingrefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token ")
        }
        if(incomingrefreshToken !== user?.refreshToken){
            throw new ApiError(401, " refresh token is expired or use")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)

        return res.status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", newrefreshToken, options)
       .json(
            new ApiResponse(
                200,{
                    accessToken,
                    refreshToken: newrefreshToken,

                },
                "access token refreshed successfully"
            )
        )

    }catch(e){
        throw new ApiError(401, "unauthorized access ")
    }


})

const changeCurrentPassword=asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} =req.body

    const user= await User.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401,"Incorrect old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "current user details"
        )
    )
    
})


const updateUserProfile=asyncHandler(async (req,res) => {
    const {fullName,email,username}=req.body
    if(!fullName || !email || !username){
        throw new ApiError(400,"All fields are required")
    }
    const user= await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email,
                username:username.toLowerCase()
            }
        },
        {new:true})
        .select("-password")


        return res.status(200).json(
            new ApiResponse(
                200,
                user,
                "user profile updated successfully"
            )
        )
})

const updateUserAvatar=asyncHandler(async (req,res) => {
    const avatarLocalPath= await req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar=await uploadonCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Failed to upload avatar to cloudinary")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true})
       .select("-password")
       return res.status(200).json(
            new ApiResponse(
                200,
                user,
                "user avatar updated successfully"
            ))
})

const updateUserCoverImage=asyncHandler(async (req,res) => {
    const coverImageLocalPath= await req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"cover image is required")
    }

    const coverImage=await uploadonCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Failed to upload coverImage to cloudinary")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true})
       .select("-password")
       return res.status(200).json(
            new ApiResponse(
                200,
                user,
                "user coverImage updated successfully"
            ))
})

const getUserChannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username){
        throw new ApiError(400,"usrname is missing")

    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()

            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"

            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel doesmt exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"channel fetched succesfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {registeruser,
    loginuser,
    logoutuser,
    refreshaccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserProfile,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}

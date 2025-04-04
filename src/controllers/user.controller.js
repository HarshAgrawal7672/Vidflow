import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadonCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
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
    
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar=await uploadonCloudinary(avatarLocalPath);
    const coverImage=await uploadonCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400,"Avatar is required")

    }


   const user=await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
   }) 

   const createdUser=await User.findById(username._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
       throw new ApiError(500,"Failed to create user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
   )
})
 
export {registeruser}
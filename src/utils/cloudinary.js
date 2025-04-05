import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET 
});


const uploadonCloudinary = async (localfilepath) => {
    try{
        if(!localfilepath){ return null}
        const response=await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })
        
        // console.log("Uploaded in cloudinary",response.url);
        fs.unlinkSync(localfilepath)

        return response;
    }catch(err){
        fs.unlinkSync(localfilepath)
        return null;
    }

}


export {uploadonCloudinary}
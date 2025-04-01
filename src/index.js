// require('dotenv').config({path:"./env"})

import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path:"./env"
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server running on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
})
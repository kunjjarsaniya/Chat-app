import React, { useState, useContext } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext.jsx';

const ProfilePage = () => {

  const { authUser, updateProfile } = useContext(AuthContext);

  const [selectedImg, setSelectedImg] = useState(null);
  const navigate = useNavigate();
  const [name, setName] = useState(authUser.fullName);
  const [bio, setBio] = useState(authUser.bio);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!selectedImg) {
      await updateProfile({ fullName: name, bio });
      navigate('/');
      return;
    }
    
    if(selectedImg) {
      const render = new FileReader();
      render.readAsDataURL(selectedImg);
      render.onload = async() => {
        const base64Image = render.result;
        await updateProfile({ profilePic: base64Image, fullName: name, bio });
        navigate('/');
      };
    }
  }

  return (
    <div className='min-h-screen bg-cover bg-no-repeat flex items-center justify-center'>
      <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg'>
        <form 
          onSubmit={handleSubmit} 
          className='flex flex-col gap-5 p-10 flex-1'>
            <h3 className='text-lg'>Profile details</h3>
            <label htmlFor="avatar" className='flex items-center gap-3'>
              <input onChange={(e) => setSelectedImg(e.target.files[0])} type="file" id="avatar" accept="image/*" hidden/>

              <img src={selectedImg ? URL.createObjectURL(selectedImg) : assets.avatar_icon} alt="" className={`w-12 h-12 cursor-pointer ${selectedImg && 'rounded-full'} `} />
              <p className='text-xs cursor-pointer'>Upload profile image</p>
            </label>

            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder='Your Name' className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500'/>

            <textarea onChange={(e) => setBio(e.target.value)} value={bio} rows={4} 
            className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500' placeholder='Write a profile bio...' required></textarea>

            <button type='submit' className='p-2 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-full text-lg cursor-pointer'>
              Save
            </button>
        </form>

        <img src={authUser?.profilePic || assets.logo_icon} alt="" 
          className={`max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10 ${selectedImg && 'rounded-full'}`}
        />
      </div>
    </div>
  )
}

export default ProfilePage
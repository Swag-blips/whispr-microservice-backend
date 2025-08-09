const avatars = [
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726155/user-1_dckcvb.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726351/user-2_yl3up9.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726351/user-3_u32gk3.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726493/user-4_wbomhn.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726493/user-5_lubl5w.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726828/user-6_isclkf.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754726828/user-7_ppqhvj.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754727267/user-8_ncqgge.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754727267/user-9_w1kl3p.png",
  "https://res.cloudinary.com/dh3c9ay9z/image/upload/v1754727267/user-10_ezf0u1.png",
];

export const getAvatarImage = () => {
  return avatars[Math.floor(Math.random() * avatars.length)];
};


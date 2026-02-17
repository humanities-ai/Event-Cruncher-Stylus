import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Root.css';

const Root = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const images = [
    { name: 'binary_image.png', src: '/images/binary_image.png', link: '/levels/BinaryLevel' },
    { name: 'tetrahedron_image.png', src: '/images/tetrahedron_image.png', link: '/levels/TetrahedralLevel' },
    { name: 'cube_image.png', src: '/images/cube_image.png', link: '/levels/CubicLevel' },
    { name: 'octahedron_image.png', src: '/images/octahedron_image.png', link: '/levels/Navigator' }
  ];

  const handleImageClick = (imageName) => {
    setSelectedImage(imageName);
  };

  return (
    <div className="selection-container">
      <h1>Make a Selection</h1>
      <div className="image-grid">
        {images.map((image, index) => (
          <Link to={image.link} key={index} onClick={() => setSelectedImage(image.name)} className="image-box">
            <img src={image.src} alt={image.name} className="image" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Root;

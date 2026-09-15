import React from 'react';
import { useParams } from 'react-router-dom';
import PropertyForm from './PropertyForm';

const EditProperty = () => {
  const { id } = useParams();
  return <PropertyForm propertyId={id} />;
};

export default EditProperty;

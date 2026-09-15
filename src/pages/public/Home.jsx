import React from 'react';
import { Helmet } from 'react-helmet-async';
import HeroSection from '../../components/sections/home/HeroSection';
import QuickActions from '../../components/sections/home/QuickActions';
import WhyChoose from '../../components/sections/home/WhyChoose';
import HowItWorks from '../../components/sections/home/HowItWorks';
import FeaturedProperties from '../../components/sections/home/FeaturedProperties';
import ExploreNeighborhoods from '../../components/sections/home/ExploreNeighborhoods';
import FaqSection from '../../components/sections/home/FaqSection';
import PartnersSection from '../../components/sections/home/PartnersSection';
import TrendingTopics from '../../components/sections/home/TrendingTopics';
import styles from './Home.module.css';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>H.O.M Advisory | Find Your Dream Home in Bangalore</title>
        <meta
          name="description"
          content="Discover premium properties in Bangalore with H.O.M Advisory. Buy, rent, or lease luxury apartments, villas, and office spaces with expert guidance."
        />
      </Helmet>

      <div className={styles.homePage}>
        <HeroSection />
        <QuickActions />
        <WhyChoose />
        <HowItWorks />
        <FeaturedProperties />
        <ExploreNeighborhoods />
        <FaqSection />
        <PartnersSection />
        <TrendingTopics />
      </div>
    </>
  );
};

export default Home;

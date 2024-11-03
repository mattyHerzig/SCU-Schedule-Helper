import React, { useState } from 'react';
import Main from '../components/pageComponents/main';
import Preferences from '../components/pageComponents/preferences';
import Menu from '../components/Menu';
import Friends from '../components/pageComponents/friends';

export default function Home() {
  const [activePage, setActivePage] = useState('main');

  const navigateToPage = (page) => {
    setActivePage(page);
  };

  return (
    <>
      <Menu navigateToPage={navigateToPage} />
      {activePage === 'main' && <Main navigateToPage={navigateToPage} />} 
      {activePage === 'preferences' && <Preferences navigateToPage={navigateToPage} />}
      {activePage === 'friends' && <Friends navigateToPage={navigateToPage} />}
    </>
  );
}

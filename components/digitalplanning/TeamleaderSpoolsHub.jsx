import React from 'react';
import TeamleaderHub from './TeamleaderHub.jsx';

// Dit is de specifieke view voor de Spool afdeling
const TeamleaderSpoolsHub = () => {
  return (
    <TeamleaderHub fixedScope="spool" />
  );
};

export default TeamleaderSpoolsHub;
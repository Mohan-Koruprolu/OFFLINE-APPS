
import { Member } from '../types';

const NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley"];
const AVATARS = [
  "https://picsum.photos/seed/1/100",
  "https://picsum.photos/seed/2/100",
  "https://picsum.photos/seed/3/100",
  "https://picsum.photos/seed/4/100",
  "https://picsum.photos/seed/5/100",
];

export const generateMockMember = (id: string): Member => {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return {
    id,
    name,
    rssi: -50,
    distance: 2,
    lastSeen: Date.now(),
    status: 'connected',
    avatar,
    battery: 40 + Math.floor(Math.random() * 60) // Start with 40-100%
  };
};

/**
 * Simulates RSSI fluctuations, distance calculations, and battery drain.
 */
export const updateMemberDistance = (member: Member): Member => {
    // Random walk for distance
    const drift = (Math.random() - 0.45) * 3; 
    let newDistance = Math.max(0.5, member.distance + drift);
    
    // Map distance back to a simulated RSSI
    const rssi = -50 - (10 * 2.5 * Math.log10(newDistance));

    // Simulate slow battery drain
    const drain = Math.random() > 0.8 ? 1 : 0;
    const newBattery = Math.max(0, member.battery - drain);

    let status: 'connected' | 'warning' | 'lost' = 'connected';
    if (newDistance > 25) status = 'lost';
    else if (newDistance > 15) status = 'warning';

    return {
        ...member,
        distance: Number(newDistance.toFixed(1)),
        rssi: Math.round(rssi),
        lastSeen: Date.now(),
        status,
        battery: newBattery
    };
};

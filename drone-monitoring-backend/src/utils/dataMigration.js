const TelemetryData = require('../models/telemetryData');
const Drone = require('../models/drone');
const logger = require('./logger');

/**
 * Migrate existing telemetry data to frontend-compatible format
 */
async function migrateTelemetryData() {
  try {
    logger.info('Starting telemetry data migration...');
    
    // Find all telemetry records that don't have lat/lng fields
    const recordsToUpdate = await TelemetryData.find({
      $or: [
        { lat: { $exists: false } },
        { lng: { $exists: false } },
        { lat: null },
        { lng: null }
      ]
    });
    
    logger.info(`Found ${recordsToUpdate.length} records to migrate`);
    
    let updatedCount = 0;
    for (const record of recordsToUpdate) {
      try {
        // Extract lat/lng from location object if available
        if (record.location && record.location.latitude && record.location.longitude) {
          record.lat = record.location.latitude;
          record.lng = record.location.longitude;
        } else {
          // Set default coordinates if no location data
          record.lat = 0;
          record.lng = 0;
        }
        
        // Normalize status if needed
        if (record.status) {
          record.status = normalizeStatus(record.status);
        }
        
        await record.save();
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          logger.info(`Migrated ${updatedCount}/${recordsToUpdate.length} records`);
        }
      } catch (error) {
        logger.error(`Error migrating record ${record._id}:`, error);
      }
    }
    
    logger.info(`Telemetry migration completed. Updated ${updatedCount} records`);
    return updatedCount;
  } catch (error) {
    logger.error('Error during telemetry migration:', error);
    throw error;
  }
}

/**
 * Migrate existing drone data to frontend-compatible format
 */
async function migrateDroneData() {
  try {
    logger.info('Starting drone data migration...');
    
    // Find all drone records
    const drones = await Drone.find({});
    
    logger.info(`Found ${drones.length} drones to migrate`);
    
    let updatedCount = 0;
    for (const drone of drones) {
      try {
        // Normalize status if needed
        if (drone.status) {
          drone.status = normalizeStatus(drone.status);
        }
        
        // Update online status
        drone.updateOnlineStatus();
        
        await drone.save();
        updatedCount++;
      } catch (error) {
        logger.error(`Error migrating drone ${drone.droneId}:`, error);
      }
    }
    
    logger.info(`Drone migration completed. Updated ${updatedCount} records`);
    return updatedCount;
  } catch (error) {
    logger.error('Error during drone migration:', error);
    throw error;
  }
}

/**
 * Normalize status values to match frontend expectations
 */
function normalizeStatus(status) {
  if (!status) return 'Standby';
  
  const statusMap = {
    'powered_off': 'Powered Off',
    'powered off': 'Powered Off',
    'in_flight': 'In Flight',
    'in flight': 'In Flight',
    'pre_flight': 'Pre-Flight',
    'pre flight': 'Pre-Flight',
    'returning': 'Returning',
    'delivered': 'Delivered',
    'landing': 'Landing',
    'maintenance': 'Maintenance',
    'emergency': 'Emergency',
    'active': 'Active',
    'standby': 'Standby',
  };

  const normalized = statusMap[status.toLowerCase()] || status;
  
  // Validate against allowed statuses
  const allowedStatuses = [
    'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
    'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
  ];
  
  return allowedStatuses.includes(normalized) ? normalized : 'Standby';
}

/**
 * Run complete data migration
 */
async function runMigration() {
  try {
    logger.info('Starting complete data migration...');
    
    const telemetryCount = await migrateTelemetryData();
    const droneCount = await migrateDroneData();
    
    logger.info(`Migration completed successfully:`);
    logger.info(`- Telemetry records updated: ${telemetryCount}`);
    logger.info(`- Drone records updated: ${droneCount}`);
    
    return { telemetryCount, droneCount };
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check migration status
 */
async function checkMigrationStatus() {
  try {
    const telemetryCount = await TelemetryData.countDocuments({
      $or: [
        { lat: { $exists: false } },
        { lng: { $exists: false } },
        { lat: null },
        { lng: null }
      ]
    });
    
    const droneCount = await Drone.countDocuments({
      status: { $nin: [
        'Standby', 'Pre-Flight', 'Active', 'In Flight', 'Landing', 
        'Delivered', 'Returning', 'Powered Off', 'Maintenance', 'Emergency'
      ]}
    });
    
    return {
      needsTelemetryMigration: telemetryCount > 0,
      needsDroneMigration: droneCount > 0,
      telemetryCount,
      droneCount
    };
  } catch (error) {
    logger.error('Error checking migration status:', error);
    throw error;
  }
}

module.exports = {
  migrateTelemetryData,
  migrateDroneData,
  runMigration,
  checkMigrationStatus,
  normalizeStatus
}; 
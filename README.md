# PrusaMonitor
Simple print status monitor for Prusa i3 MK3s running on Raspberry Pi Zero W attached to MK3s RAMBo.

## Requirements
@TODO

## Setup
@TODO

## Output
Currently the server returns a simple JSON string with the status of the printer. This will be improved in the future.

```json
{
    "isPrinting": true,
    "printComplete": false,
    "fileName": "compli~2.gco",
    "fileSize": 1296528,
    "percent": 83,
    "timeRemaining": 11,
    "timeTotal": 71
}
```

## Future
- Better web interface with api for app integration.
- Ability to move X,Y,Z,E stepper motors.
- Possible file selection/upload and start/stop print.
- Crash, Error & Print complete email/push notifications.

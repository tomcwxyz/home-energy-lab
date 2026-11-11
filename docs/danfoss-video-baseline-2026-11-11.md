# Danfoss programme video baseline (11 November 2026)

Source: user-supplied 112-second walkthrough of Danfoss programmer.
The footage shows the radiator (heating) programme first, followed by the hot-water (tap) programme. All visible programmed times match between the two channels.

| Day | Morning | Midday | Evening |
|---|---|---|---|
| Monday | 06:00–08:30 | 12:00–12:20 | 15:00–20:30* |
| Tuesday | 06:00–08:45 | 12:00–12:20 | 15:00–20:30 |
| Wednesday | 06:00–08:30 | 12:00–12:20 | 15:00–19:30 |
| Thursday | 06:00–08:40 | 12:00–12:20 | 15:00–21:00 |
| Friday | 06:00–08:40 | 12:00–12:20 | 15:00–21:30 |
| Saturday | 07:00–09:30 | 12:00–13:30 | 15:00–21:00 |
| Sunday | 07:20–09:30 | none | 15:00–21:10, 21:10–21:30 |

* Monday hot-water final OFF is not visible before the video ends. It is temporarily recorded as 20:30 based on matching radiator programme. Marked partly_inferred.

Sunday's set 4 OFF event at 21:10 and set 5 ON event at 21:10 are saved as adjacent slots to preserve the original programmer events.

This is a schedule transcription only; manual overrides, thermostat calls, actual burner activity, cylinder temperatures and boiler flow settings were not captured in the video.

All 14 day/channel records were inserted in the dedicated Neon database with source IDs video-2026-11-11-{heating|hot_water}-{1..7}. The application queries them from programme_daily_history. Historical records in programme_history are preserved.

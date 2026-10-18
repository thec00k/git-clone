# Cabin walls and log ceiling: before and after

Owner request (October 17): walls that read as stacked solid logs, with no gaps between the logs and the wall or beside the door frame, and a log roof with support beams that stays clear of the ceiling fan and light. Reference photos: a log bedroom with French doors (logs running straight into the door casing), a gabled great room with exposed beams, and a log bedroom with a plank ceiling, log beams and a ceiling fan.

Renders are Cycles (32 samples, denoised) of `woodland-study.blend` before the change and after the polish pass (log tones and checks, casing, glowing fan bowl), with the same five cameras and lights. They were made with `render-script/review-render.py`:

```
python review-render.py 32 <woodland-study.blend> <output-prefix>
```

| View | What to look at |
| --- | --- |
| `room` | Window wall: logs end inside the window frame and along the sloped transom; joists and a support beam at the top. |
| `ceiling` | Plank ceiling, four log joists, two support beams, the fan hanging in the open centre. |
| `door` | Logs run into the door frame; no strip of flat wall beside it. |
| `corner` | Inner corner closes on log; no pale strips between courses. |
| `side` | Shelf wall and the far corner. |

The before shots show the previous issue clearly: the flat shell walls stood in front of the creases between logs and read as pale strips, and the courses stopped short of the door frame. See `art/woodland-study/README.md` for the build details.

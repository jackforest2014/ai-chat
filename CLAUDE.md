# Guidelines for project ai_chat


## Development
Before actually implement a feature, generate a detailed design doc under docs/design_decisions.
The document may contains data schema update, business logic interaction, data points that may be needed, monitors and traces that may be needed and etc.


### Checkppint
Every time a development work is finished
* update change logs in folder change_logs in file YYYY_MM_DD.log
* update architecture document in docs/architecture.md. If the file grows too large, split it into modulars under a subfolder docs/architecture/
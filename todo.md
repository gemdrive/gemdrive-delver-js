* Parse remfs path at startup and use that to set oauth scope
* Add smarter thumbnail finding
  * Should be able to put thumbnails in local directory, or any parent.
* Don't use tokens for public files
* Don't request permanent tokens
* Implement text previews
* Allow trailing slash on load
* Maintain state of selected items across navigations
  * Will probably require passing in current render state
* Create an async task list for tracking things like moves and uploads that
  can take a long time.

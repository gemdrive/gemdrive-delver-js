* Add smarter thumbnail finding
  * Should be able to put thumbnails in local directory, or any parent.
* Don't request permanent tokens
* Implement text previews
* Allow trailing slash on load
* Maintain state of selected items across navigations
  * Will probably require passing in current render state to components
* Create an async task list for tracking things like moves and uploads that
  can take a long time.
* Add ability to force login even if top-level doesn't require it.
* Add ability to generate capability URLs for apps like VLC.
* Handle selecting both parent and child items, ie don't want to attempt to
  delete a child if the parent has already be deleted.
* Warn when overwriting.
* Add ability to show QR code for a location.

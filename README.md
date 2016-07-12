# MEdit
You can view a demo of MEdit [here](https://rawgit.com/wayf-dk/medit/master/demo/index.html).

MEdit is an experimental schema driven hierachi-tabular client side viewer/editor for SAML metadata.

In its current state it is mostly a javascript port of some legacy code from PHPH. The intention is that it should become a client side plug-in that allows layman editing of - parts of - SAML metadata in a registry.

It currently allows ‘live’ editing of metadata, but with some severe limitations eg. deletion is not working.

It has value lists for most of the fields with known permissible values eg. bindings, but is otherwise just a thin layer on top of the XML. <em>Support for value lists seems to differ between the browsers:
Safari doesn't support them at all. Chrome only supports implied end truncation (^xxx*) while FireFox supports full truncation (*xxx*)</em>

We have published it in this early stage to get some feed-back on the approach and functionality - please use the issue tracker for that.

Thanks to our student aide Lauritz Hilsøe who did the porting.

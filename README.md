# MEdit
You can view a demo of MEdit [here](https://rawgit.com/wayf-dk/medit/master/demo/index.html).

MEdit is a schema driven hierachi-tabular client side viewer/editor for SAML metadata.

In its current state it is just a javascript port of some legacy code from PHPH. The intention is that it should become a client side plug-in that allows layman editing of - parts of - SAML metadata in a registry.

It currently allows ‘live’ editing of metadata, but with some severe limitations eg. deletion is not working.

It has value lists for fields with known permissible values eg. bindings, but is otherwise just a thin layer on top of the XML.

We have published it in this early stage to get some feed-back on the approach and functionality - please use the issue tracker for that.

// EaseJS created 2025 by Christian Bone, version 1.0
// Created for Nivix Studio by Nivix Technology https:/www.nivixtech.com/

const wait = ms => new Promise(res => setTimeout(res, ms));

const getEBD = id => {
    if (typeof id !== "string") return null;
    return document.getElementById(id);
};

const newEl = document.createElement.bind(document);
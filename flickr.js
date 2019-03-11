const Flickr = require('flickr-sdk');

//My API (since Flickr now requires a non-commercial API key to use publicly)
var flickr = new Flickr("86fba604dddd952d651db1f9f28c850c");

class FlickrAddon {

    flickrSearchUserID() {
        flickr.photos.search({
                user_id: flickr.options.user_id,
                page: 1,
                per_page: 500
            }, function(err, result) {
        });

        return true;
    };

    flickrSearchPhotos() {
        flickr.people.getPhotos({
            api_key: [],
            user_id: [],
            page: 1,
            per_page: 100
            }, function(err, result) {
            }
        );

        return true;
    };

    flickrConstructURL(photoInfo) {
        //https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg

        var base_url = `https://farm${photoInfo.farm}.staticflickr.com/${photoInfo.server}/${photoInfo.id}_${photoInfo.secret}.jpg`;

        console.log(JSON.stringify(base_url));

        return base_url;        
    }

    async flickrPhotoInfo(photoInfo) {
        var photo_info = {};

        try {
            var photo_details_struct = await flickr.photos.getInfo({ 
                api_key: "86fba604dddd952d651db1f9f28c850c", 
                photo_id: photoInfo.id,
                secret: photoInfo.secret
            });
        } catch (err) {
            
        }

        if (photo_details_struct && photo_details_struct.text) {
            var temp_photo_info = JSON.parse(photo_details_struct.text);

            //Title is an odd object, just get first key which should be _content
            photo_info.title = temp_photo_info.photo.title ? temp_photo_info.photo.title[Object.keys(temp_photo_info.photo.title)[0]] : 'No title';
            photo_info.description = temp_photo_info.photo.description ? temp_photo_info.photo.description[Object.keys(temp_photo_info.photo.description)[0]] : 'No description';
            photo_info.author_name = (temp_photo_info.photo.owner && temp_photo_info.photo.owner.realname) ? temp_photo_info.photo.owner.realname : 'Unknown Author';
            photo_info.date_taken = (temp_photo_info.photo.dates && temp_photo_info.photo.dates.taken) ? temp_photo_info.photo.dates.taken : 'Unknown date taken';
            photo_info.owner_id = temp_photo_info.photo.owner.nsid;
        }

        return photo_info;
    }

    async flickrGetRandomImages() {
        //"text": "{\"photos\":{\"page\":1,\"pages\":200,\"perpage\":5,\"total\":1000,\"photo\":[{\"id\":\"33451151178\",\"owner\":\"37818606@N00\",\"secret\":\"6f781dc0d6\",\"server\":\"7900\",\"farm\":8,\"title\":\"DSCF6098.jpg\",\"ispublic\":1,\"isfriend\":0,\"isfamily\":0},{\"id\":\"33451151318\",\"owner\":\"168392494@N07\",\"secret\":\"bf5607f865\",\"server\":\"7900\",\"farm\":8,\"title\":\"18-10-20_19-01-42.jpg\",\"ispublic\":1,\"isfriend\":0,\"isfamily\":0},{\"id\":\"40361772263\",\"owner\":\"147989646@N08\",\"secret\":\"403dc024f5\",\"server\":\"7921\",\"farm\":8,\"title\":\"I am made of magic\",\"ispublic\":1,\"isfriend\":0,\"isfamily\":0},{\"id\":\"47274383492\",\"owner\":\"86170302@N02\",\"secret\":\"d830b6b5bd\",\"server\":\"7855\",\"farm\":8,\"title\":\"Bouquet-5.jpg\",\"ispublic\":1,\"isfriend\":0,\"isfamily\":0},{\"id\":\"47274383742\",\"owner\":\"162689454@N06\",\"secret\":\"0903c76a7b\",\"server\":\"7877\",\"farm\":8,\"title\":\"KUSATSU\",\"ispublic\":1,\"isfriend\":0,\"isfamily\":0}]},\"stat\":\"ok\"}"

        var results = {};
        try {
            results = await flickr.photos.getRecent({ per_page: 5, page: 1 });
        } catch (err) {
            return [];
        }

        if (results && results.text) {
            var jsonResults = JSON.parse(results.text);
            var photoResults = [];

            if (jsonResults.photos && jsonResults.photos.photo && jsonResults.photos.photo.length) {
                //I need sync results, so DO NOT use map
                for (var photoElementIndex in jsonResults.photos.photo) {
                    var photoElement = jsonResults.photos.photo[photoElementIndex];

                    photoElement.base_url = this.flickrConstructURL(photoElement);
                    photoElement.photo_info = await this.flickrPhotoInfo(photoElement);
                    photoResults.push(photoElement);
                }
            }

            return photoResults;
        }

        return [];
    }

    async flickrGetImagesByAuthor(owner_id, startList) {
        var results = {};
        try {
            results = await flickr.photos.search({ user_id: owner_id, per_page: 5, page: startList });
        } catch (err) {
            return [];
        }

        if (results && results.text) {
            var jsonResults = JSON.parse(results.text);
            var photoResults = [];

            if (jsonResults.photos && jsonResults.photos.photo && jsonResults.photos.photo.length) {
                //I need sync results, so DO NOT use map
                for (var photoElementIndex in jsonResults.photos.photo) {
                    var photoElement = jsonResults.photos.photo[photoElementIndex];

                    photoElement.base_url = this.flickrConstructURL(photoElement);
                    photoElement.photo_info = await this.flickrPhotoInfo(photoElement);
                    photoResults.push(photoElement);
                }
            }

            return photoResults;
        }

        return [];
    }
}

module.exports.FlickrAddon = FlickrAddon;
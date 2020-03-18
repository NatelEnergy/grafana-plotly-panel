filling in the history:

```
git tag -a v0.0.1 187e7b5743f0dceb1034b03eaac62989af50d0c0 -m "Release v0.0.1";
git tag -a v0.0.2 68947cf1d73b7bcceceebaf795c60a7b76eaec87 -m "Release v0.0.2";
git tag -a v0.0.3 371cbf41006a534a671a9582a3e24ce3cf29d9b1 -m "Release v0.0.3";
git tag -a v0.0.4 df51dc99e63c781f2ddc9590b7f106e40648738d -m "Release v0.0.4";
git tag -a v0.0.5 fd20e71fc45a59475fb2f1fdde687f93978bde18 -m "Release v0.0.5";
git push --tags
```

Remove all old releases:

```
#Delete local tags.
git tag -d $(git tag -l)
#Fetch remote tags.
git fetch
#Delete remote tags.
git push origin --delete $(git tag -l) # Pushing once should be faster than multiple times
#Delete local tags.
git tag -d $(git tag -l)
```

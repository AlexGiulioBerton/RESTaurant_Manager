# RESTaurant Manager
*Project work for the Tecnologie e Applicazioni Web course of the 3-year degree in IT at Ca' Foscari University of Venice*

## Server

## Run Mongo Container
Use this command to run a mongo docker container

1)

    docker network create restaurant_manager


2)

    docker run --network restaurant_manager -p 27017:27017 --name mymongo -d mongo:6


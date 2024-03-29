import PropTypes from 'prop-types'
import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import queryString from 'query-string';
import {
  Button,
  Container,
  Header,
  Responsive,
  Segment,
  Visibility,
} from 'semantic-ui-react'
import Forms from './Forms'
import './App.css';

const getWidth = () => {
  const isSSR = typeof window === 'undefined'

  return isSSR ? Responsive.onlyTablet.minWidth : window.innerWidth
}

const PlaylistHeading = ({ mobile }) => ( // Header
  <Container text>
    <Link to='/'><Button>Home</Button></Link>
    <Header
      as='h1'
      inverted
      style={{
        fontSize: mobile ? '2em' : '4em',
        fontWeight: 'normal',
        marginBottom: 0,
        marginTop: mobile ? '1em' : '0.5em',
      }}
    />
  </Container>
)

PlaylistHeading.propTypes = {
  mobile: PropTypes.bool,
}

class DesktopContainer extends Component { // Desktop Layout
  state = {}

  render() {
    const { children } = this.props

    return (
      <Responsive getWidth={getWidth} minWidth={Responsive.onlyTablet.minWidth}>
        <Visibility
          once={false}
        >
          
          <Segment
            inverted
            textAlign='center'
            style={{ minHeight: 725, padding: '1em 0em'}}
            vertical
          >
            <PlaylistHeading/>
            {children}
          </Segment>
        </Visibility>
      </Responsive>
    )
  }
}

DesktopContainer.propTypes = {
  children: PropTypes.node,
}

class MobileContainer extends Component { // Mobile Layout
  state = {}

  render() {
    const { children } = this.props

    return (
      <Responsive
        getWidth={getWidth}
        maxWidth={Responsive.onlyMobile.maxWidth}
      >
          <Segment
            inverted
            textAlign='center'
            style={{ minHeight: 350, padding: '1em 0em' }}
            vertical
          >
            <PlaylistHeading mobile />
            {children}
          </Segment>
      </Responsive>
    )
  }
}

MobileContainer.propTypes = {
  children: PropTypes.node,
}

const ResponsiveContainer = ({ children }) => ( // Responsive Layout
  <div>
    <DesktopContainer>{children}</DesktopContainer>
    <MobileContainer>{children}</MobileContainer>
  </div>
)

ResponsiveContainer.propTypes = {
  children: PropTypes.node,
}

class Playlist extends Component { // Component for individual playlists
  constructor() {
    super();
    this.state = {
    }
  }

  componentDidMount() {
    let parsed = queryString.parse(window.location.search);
    let accessToken = parsed.access_token;

    fetch('https://api.spotify.com/v1/me', { // user data
      headers: {'Authorization': 'Bearer ' + accessToken}
    }).then(response => response.json())
    .then(data => this.setState({
      user: {
        name: data.display_name
      }
    }))

    fetch('https://api.spotify.com/v1/me/playlists', { // playlist data
      headers: {'Authorization': 'Bearer ' + accessToken}
    }).then(response => response.json())
    .then(playlistData => {
      let playlists = playlistData.items
      let trackDataPromises = playlists.map(playlist => {
        let responsePromise = fetch(playlist.tracks.href, {
          headers: {'Authorization': 'Bearer ' + accessToken}
        })
        let trackDataPromise = responsePromise
          .then(response => response.json())
        return trackDataPromise
      })
      let allTracksDataPromises = 
        Promise.all(trackDataPromises)
      let playlistsPromise = allTracksDataPromises.then(trackDatas => {
        trackDatas.forEach((trackData, i) => {
          playlists[i].trackDatas = trackData.items
            .map(item => item.track)
            .map(trackData => ({
              name: trackData.name,
              duration: trackData.duration_ms / 1000
            }))
        })
        return playlists
      })
      return playlistsPromise
    })
    .then(playlists => this.setState({
      playlists: playlists.map(item => {
        return {
          name: item.name,
          songs: item.trackDatas,
          id: item.id,
        }
    })
    }))
  }

  // function for buttons to delete songs
  delSong = async (song, playlist) => {
    let parsed = queryString.parse(window.location.search);
    let accessToken = parsed.access_token;

    // fetches the uri and position of song we want to delete
    await fetch('https://api.spotify.com/v1/playlists/' + playlist.id + '/tracks', {
        headers: {'Authorization': 'Bearer ' + accessToken}
      }
    ).then(response => (response.json()))
    .then(data => (data.items))
    .then(itemArray => {
      for(var i = 0; i < itemArray.length; i++) {
        if(itemArray[i].track.name === song.name) {
          song.position = i
          return itemArray[i]
        }
      }
    })
    .then(itemInArray => (itemInArray.track.uri))
    .then(uri => {
      song.uri = uri
    })

    // post method to delete songs
    fetch('https://api.spotify.com/v1/playlists/' + playlist.id + '/tracks', { 
        method: 'DELETE',
        body: JSON.stringify({
          "tracks": [
            {
              "uri": song.uri,
              "positions": [
                song.position
              ]
            }
          ]
        }),
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
      }
    )
    window.location.reload();
  }

  render() {
    let parsed = queryString.parse(window.location.search);
    let selectedPlaylist = parsed.selected;
    let accessToken = parsed.access_token;
    // selected playlist
    let myPlaylist = 
      this.state.user &&
      this.state.playlists
        ? this.state.playlists.filter(function(playlist){
          return playlist.name === selectedPlaylist;
      }) : []

    // songs in selected playlist
    let mySongs = 
      myPlaylist[0] &&
      myPlaylist[0].songs
        ? myPlaylist[0].songs.map((song) => {
          return <Button onClick={() => this.delSong(song, myPlaylist[0])} key={`${song.name}`} style={{marginBottom:'1rem'}}>{song.name}</Button>
      }) : []

    return (
      <ResponsiveContainer>
      <div className="App">
        {this.state.user && this.state.playlists ?
        <Container text>
          <Segment.Group style={{textAlign: 'center'}}>
            <Forms access_token={accessToken} playlist_id={myPlaylist[0].id}/>
            <p>
              Note: Due to the Spotify API's upper limit of 100 fetched tracks, this application 
              will only render the first 100 tracks if your playlist contains over 100 songs.
              Adding and deleting songs is still possible.
            </p>
            <h1>{selectedPlaylist}</h1>
            <p>Press songs you want to delete</p>
            {mySongs}
          </Segment.Group>
        </Container> : <p>Loading</p>
        }
      </div>
      </ResponsiveContainer>
    )
  }
}

export default Playlist
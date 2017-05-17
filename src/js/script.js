import { body, text, div } from './styles/style';

const applyStyles = ( selector, styles ) => {
  const sStyles = selector.style;

  for ( let key in styles ) {
    sStyles[ key ] = styles[ key ];
  }
}

applyStyles( document.querySelector( 'body' ), body );
applyStyles( document.querySelector( 'p' ), text );
applyStyles( document.querySelector( 'div' ), div );

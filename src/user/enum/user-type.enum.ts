export enum UserType {
  COMUN = 1, //NÃO ACESSA NENHUM SISTEMA DE CONTROLE
  AUXILIAR = 2, //ACESSA PJES E DIARIA NIVEL OME
  DIRETOR = 3, //ACESSA PJES E DIARIA NIVEL DIRETORIA (Distribui cotas para as OMEs)
  ESTRATEGICO = 4, //ACESSA PJES E DIARIA (visualização para planejar distribuição)
  FINANCEIRO = 5, //ACESSA DIARIA (visualização)
  PD = 6, //ACESSA DIARIA (Realiza os lançamentos)
  TECNICO = 9, //ACESSA PJES E DIARIA (Distribui pra diretorias, cria eventos e realiza lançam)
  MASTER = 10,
}
